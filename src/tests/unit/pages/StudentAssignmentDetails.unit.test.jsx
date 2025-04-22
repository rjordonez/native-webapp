import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentAssignmentDetails from '@/pages/StudentAssignmentDetails';
import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { sendToAnalysisAPI } from '@/lib/api-services';

// Mock all required dependencies
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock('@/context/ClassContext', () => ({
  useClass: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/lib/api-services', () => ({
  sendToAnalysisAPI: jest.fn(),
}));

jest.mock('@/components/AppNavbar', () => {
  return function MockedNavbar() {
    return <div data-testid="app-navbar">Navbar</div>;
  };
});

// Mock media devices
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    stream: { getTracks: () => [{ stop: jest.fn() }] },
    state: 'inactive',
  })),
});

global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({}),
};

describe('StudentAssignmentDetails', () => {
  const mockNavigate = jest.fn();
  const mockAssignment = {
    id: 'assignment-123',
    title: 'Test Assignment',
    topic: 'Speaking Practice',
    dueDate: '2025-05-01T00:00:00Z',
    questions: ['Describe your hometown', 'Talk about your favorite hobby'],
    classId: 'class-456',
    metadata: JSON.stringify({
      questionsWithTimeLimits: [
        { question: 'Describe your hometown', timeLimit: '60', example: '- Population\n- Climate' },
        { question: 'Talk about your favorite hobby', timeLimit: '90', example: '- How often\n- Why you enjoy it' }
      ]
    })
  };

  const mockSubmission = {
    id: 'submission-123',
    submission_uid: 'unique-123',
    assignmentId: 'assignment-123',
    studentId: 'user-123',
    status: 'in_progress',
    answers: [
      { questionId: 0, audioUrl: 'url-for-question-0' },
      { questionId: 1 }
    ],
  };

  const mockClasses = [
    { id: 'class-456', name: 'English 101' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router
    useParams.mockReturnValue({ id: 'assignment-123' });
    useNavigate.mockReturnValue(mockNavigate);
    
    // Mock auth context
    useAuth.mockReturnValue({
      user: { id: 'user-123', name: 'Test Student' }
    });
    
    // Mock class context
    useClass.mockReturnValue({
      assignments: [mockAssignment],
      submissions: [mockSubmission],
      getClassesByUser: jest.fn().mockReturnValue(mockClasses),
      loading: false,
      uploadAudio: jest.fn().mockResolvedValue('new-audio-url'),
      updateSubmission: jest.fn().mockResolvedValue({}),
    });

    // Mock for Date.now
    jest.spyOn(Date, 'now').mockImplementation(() => 1619654400000);

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);
  });

  test('renders assignment details correctly', () => {
    render(<StudentAssignmentDetails />);
    
    expect(screen.getByText('Test Assignment')).toBeInTheDocument();
    expect(screen.getByText('Speaking Practice')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Describe your hometown')).toBeInTheDocument();
  });

  test('navigates back to dashboard when back button is clicked', () => {
    render(<StudentAssignmentDetails />);
    
    const backButton = screen.getByText(/Back to Dashboard/i);
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/student');
  });

  test('displays progress correctly', () => {
    render(<StudentAssignmentDetails />);
    
    expect(screen.getByText('Progress: 1/2 answered')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('shows existing recording for the current question', () => {
    render(<StudentAssignmentDetails />);
    
    expect(screen.getByText('Recording Complete')).toBeInTheDocument();
    // Query by tag name instead of role since audio elements may not be recognized by role
    const audioElement = document.querySelector('audio');
    expect(audioElement).not.toBeNull();
    expect(audioElement).toHaveAttribute('src', 'url-for-question-0');
  });

  test('handles navigation between questions', () => {
    render(<StudentAssignmentDetails />);
    
    // Initially on question 1
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    
    // Navigate to question 2
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Talk about your favorite hobby')).toBeInTheDocument();
    
    // Navigate back to question 1
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Describe your hometown')).toBeInTheDocument();
  });

  test('starts and stops recording', async () => {
    // Set up mocked timers
    jest.useFakeTimers();

    // Create a more complete MediaRecorder mock that properly handles events
    const mockStart = jest.fn();
    const mockStop = jest.fn();
    const mockAddEventListener = jest.fn();
    const mockGetTracks = jest.fn().mockReturnValue([{ stop: jest.fn() }]);
    
    const eventCallbacks = {};
    
    const mockMediaRecorder = {
      start: mockStart,
      stop: mockStop,
      addEventListener: (event, callback) => {
        eventCallbacks[event] = callback;
        mockAddEventListener(event, callback);
      },
      stream: { getTracks: mockGetTracks },
      state: 'recording'
    };
    
    // Mock the MediaRecorder constructor
    window.MediaRecorder.mockImplementation(() => mockMediaRecorder);
    
    // Setup getUserMedia to resolve immediately
    global.navigator.mediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });
    
    // Render the component
    render(<StudentAssignmentDetails />);
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(window.MediaRecorder).toHaveBeenCalled();
    });
    
    // Click "Record Again" since there's already a recording for question 1
    const recordAgainButton = screen.getByText('Record Again');
    fireEvent.click(recordAgainButton);
    
    // Verify recording started
    expect(mockStart).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Recording started'));
    
    // Fast-forward through minimum recording time
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Instead of trying to find the stop button by SVG class,
    // directly call the stop method on the MediaRecorder
    act(() => {
      // Force the stop method to be called by simulating the timer ending
      jest.advanceTimersByTime(60000);
    });
    
    // Verify stop was called
    expect(mockStop).toHaveBeenCalled();
    
    // Clean up
    jest.useRealTimers();
  });

  test('submits assignment when all questions are answered', async () => {
    // Update mock submission to have all questions answered
    const completeSubmission = {
      ...mockSubmission,
      answers: [
        { questionId: 0, audioUrl: 'url-for-question-0' },
        { questionId: 1, audioUrl: 'url-for-question-1' }
      ]
    };
    
    useClass.mockReturnValue({
      assignments: [mockAssignment],
      submissions: [completeSubmission],
      getClassesByUser: jest.fn().mockReturnValue(mockClasses),
      loading: false,
      uploadAudio: jest.fn().mockResolvedValue('new-audio-url'),
      updateSubmission: jest.fn().mockResolvedValue({}),
    });
    
    render(<StudentAssignmentDetails />);
    
    // Navigate to last question
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Submit assignment
    const submitButton = screen.getByText('Submit Assignment');
    fireEvent.click(submitButton);
    
    expect(window.confirm).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(useClass().updateSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          submittedAt: expect.any(String)
        })
      );
    });
    
    await waitFor(() => {
      expect(sendToAnalysisAPI).toHaveBeenCalledWith(
        ['url-for-question-0', 'url-for-question-1'], 
        'unique-123'
      );
    });
    
    expect(toast.success).toHaveBeenCalledWith('Assignment submitted successfully!');
    expect(mockNavigate).toHaveBeenCalledWith('/student');
  });

  test('shows loading state when assignment is not loaded', () => {
    useClass.mockReturnValue({
      assignments: [],
      submissions: [],
      getClassesByUser: jest.fn().mockReturnValue([]),
      loading: true,
      uploadAudio: jest.fn(),
      updateSubmission: jest.fn(),
    });
    
    render(<StudentAssignmentDetails />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('shows not found message when assignment does not exist', () => {
    useClass.mockReturnValue({
      assignments: [],
      submissions: [],
      getClassesByUser: jest.fn().mockReturnValue([]),
      loading: false,
      uploadAudio: jest.fn(),
      updateSubmission: jest.fn(),
    });
    
    render(<StudentAssignmentDetails />);
    
    expect(screen.getByText('Assignment not found')).toBeInTheDocument();
  });
});