import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StudentAssignmentDetails from '@/pages/StudentAssignmentDetails';
import StudentSubmissionView from '@/pages/StudentSubmissionView';
import { toast } from 'sonner';
import { sendToAnalysisAPI } from '@/lib/api-services';

// Mock all required dependencies
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
  sendToAnalysisAPI: jest.fn().mockResolvedValue({}),
}));

// Test data - Define before using in mocks
const mockUser = {
  id: 'user-123',
  name: 'Test Student'
};

const mockAssignment = {
  id: 'assignment-123',
  title: 'Test Assignment',
  topic: 'English Practice',
  dueDate: '2025-05-01T00:00:00Z',
  questions: [
    'Describe your hometown',
    'Talk about your favorite hobby'
  ],
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
    { questionId: 0 }, // No audio recorded yet
    { questionId: 1 }
  ],
};

const mockClasses = [
  { id: 'class-456', name: 'English 101' }
];

const mockAnalysisReport = {
  submission_id: 'unique-123',
  timestamp: '2025-04-15T12:00:00Z',
  status: 'completed',
  file_count: 2,
  pronunciation_analysis: [
    {
      status: 'completed',
      audio_duration: 45,
      transcript: 'This is a sample transcript.',
      overall_pronunciation_score: 85,
      accuracy_score: 88,
      fluency_score: 82,
      prosody_score: 80,
      completeness_score: 90,
      critical_errors: [],
      filler_words: [],
      word_details: [],
      improvement_suggestion: 'Practice speaking more clearly.',
      url: 'https://example.com/audio/recording1.webm'
    },
    {
      status: 'completed',
      audio_duration: 60,
      transcript: 'This is another sample transcript.',
      overall_pronunciation_score: 78,
      accuracy_score: 75,
      fluency_score: 80,
      prosody_score: 76,
      completeness_score: 85,
      critical_errors: [],
      filler_words: [],
      word_details: [],
      improvement_suggestion: 'Work on your intonation.',
      url: 'https://example.com/audio/recording2.webm'
    }
  ],
  grammar_analysis: {},
  vocabulary_suggestions: {},
  fluency_coherence_analysis: {}
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'audio/recording.webm' }, error: null }),
        download: jest.fn().mockResolvedValue({
          data: { text: jest.fn().mockResolvedValue(JSON.stringify(mockAnalysisReport)) },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/audio/recording.webm' } })
      })
    },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}));

// Mock AppNavbar component
jest.mock('@/components/AppNavbar', () => {
  return function MockedNavbar() {
    return <div data-testid="app-navbar">Navbar</div>;
  };
});

// Mock media related APIs
const mockStream = {
  getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }])
};

// Set up event handler storage
let dataAvailableHandler;
let stopHandler;

// Mock MediaRecorder
window.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn((event, handler) => {
    if (event === 'dataavailable') {
      dataAvailableHandler = handler;
    } else if (event === 'stop') {
      stopHandler = handler;
    }
  }),
  state: 'inactive'
}));

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue(mockStream)
};

// Mock context hooks directly - don't use the provider components
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: mockUser,
    profile: { role: 'student', id: 'user-123' }
  }),
  AuthProvider: ({ children }) => <>{children}</>
}));

const mockClassContextValue = {
  assignments: [mockAssignment],
  submissions: [mockSubmission],
  getClassesByUser: jest.fn().mockReturnValue(mockClasses),
  loading: false,
  uploadAudio: jest.fn().mockResolvedValue('https://example.com/audio/recording.webm'),
  updateSubmission: jest.fn().mockResolvedValue({}),
  createNewSubmission: jest.fn().mockResolvedValue({ ...mockSubmission, id: 'new-submission-123' })
};

jest.mock('@/context/ClassContext', () => ({
  useClass: jest.fn(),
  ClassProvider: ({ children }) => <>{children}</>
}));

describe('Voice Recording and Submission Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);
    
    // Mock Date.now
    jest.spyOn(Date, 'now').mockImplementation(() => 1619654400000);
    
    // Set up the default mock value for useClass
    require('@/context/ClassContext').useClass.mockReturnValue(mockClassContextValue);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  // Helper function to setup the component with MemoryRouter
  function renderWithRouter(initialRoute = '/assignment/assignment-123') {
    // Customize mock based on route
    if (initialRoute.includes('/submission/')) {
      // For submission routes, ensure all required properties are defined
      const submissionMock = {
        assignments: [mockAssignment], // This was undefined in the failing tests
        submissions: [
          {
            ...mockSubmission,
            status: 'submitted',
            submittedAt: '2025-04-15T12:00:00Z',
            answers: [
              { questionId: 0, audioUrl: 'https://example.com/audio/recording1.webm' },
              { questionId: 1, audioUrl: 'https://example.com/audio/recording2.webm' }
            ]
          }
        ],
        getClassesByUser: jest.fn().mockReturnValue(mockClasses),
        loading: false,
        uploadAudio: jest.fn().mockResolvedValue('https://example.com/audio/recording.webm'),
        updateSubmission: jest.fn().mockResolvedValue({}),
        createNewSubmission: jest.fn().mockResolvedValue({ ...mockSubmission, id: 'new-submission-123' })
      };
      require('@/context/ClassContext').useClass.mockReturnValue(submissionMock);
    } else {
      // For other routes, use the default mock value
      require('@/context/ClassContext').useClass.mockReturnValue(mockClassContextValue);
    }
    
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/assignment/:id" element={<StudentAssignmentDetails />} />
          <Route path="/submission/:id" element={<StudentSubmissionView />} />
          <Route path="/student" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }
  
  test('Complete workflow: recording, submitting and viewing report', async () => {
    // 1. Start with the assignment details page
    renderWithRouter();
    
    // Verify assignment page loaded
    await waitFor(() => {
      expect(screen.getByText('Test Assignment')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Describe your hometown')).toBeInTheDocument();
    
    // 2. Record audio for first question
    const recordButton = screen.getByText('Start Recording');
    fireEvent.click(recordButton);
    
    // Advance past the startup timeouts
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Verify recording started
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Recording started'));
    
    // Advance past minimum recording time
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    
    // Stop recording
    const stopButton = screen.getByText('Stop Recording');
    fireEvent.click(stopButton);
    
    // Manually trigger handlers for MediaRecorder events
    const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
    
    act(() => {
      dataAvailableHandler({ data: mockBlob });
      stopHandler();
    });
    
    // Verify upload was called
    await waitFor(() => {
      expect(mockClassContextValue.uploadAudio).toHaveBeenCalledWith(
        'assignment-123',
        0,
        expect.any(Blob)
      );
    });
    
    // Verify UI updated
    await waitFor(() => {
      expect(screen.getByText('Recording Complete')).toBeInTheDocument();
    });
    
    // 3. Go to second question and record
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Verify on question 2
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    
    // Record second answer (similar steps as first)
    const recordButton2 = screen.getByText('Start Recording');
    fireEvent.click(recordButton2);
    
    // Advance past the startup timeouts
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Advance past minimum recording time
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    
    // Stop recording
    const stopButton2 = screen.getByText('Stop Recording');
    fireEvent.click(stopButton2);
    
    // Manually trigger handlers for MediaRecorder events
    act(() => {
      dataAvailableHandler({ data: mockBlob });
      stopHandler();
    });
    
    // Verify upload was called for second question
    await waitFor(() => {
      expect(mockClassContextValue.uploadAudio).toHaveBeenCalledWith(
        'assignment-123',
        1,
        expect.any(Blob)
      );
    });
    
    // 4. Update mock submission to reflect completed recordings
    mockClassContextValue.submissions = [{
      ...mockSubmission,
      answers: [
        { questionId: 0, audioUrl: 'https://example.com/audio/recording1.webm' },
        { questionId: 1, audioUrl: 'https://example.com/audio/recording2.webm' }
      ]
    }];
    
    // 5. Submit the assignment
    const submitButton = screen.getByText('Submit Assignment');
    fireEvent.click(submitButton);
    
    // Verify submission updated
    await waitFor(() => {
      expect(mockClassContextValue.updateSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'submitted',
          submittedAt: expect.any(String)
        })
      );
    });
    
    // Verify analysis API was called
    expect(sendToAnalysisAPI).toHaveBeenCalled();
    
    // 6. Mock navigation to submission view
    // Since we're using jest-dom, not actual navigation, we need to re-render with submission route
    renderWithRouter('/submission/submission-123');
    
    // Verify submission view loads
    await waitFor(() => {
      expect(screen.getByText('Speaking Exercise')).toBeInTheDocument();
    });
    
    // 7. View the report
    const reportButton = screen.getByText('Speaking Report');
    fireEvent.click(reportButton);
    
    // Verify loading state appears
    expect(screen.getByText('Loading Pronunciation Report')).toBeInTheDocument();
    
    // Fast-forward through report loading
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    // Wait for report to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Pronunciation Report')).not.toBeInTheDocument();
    });
    
    // Verify report content is displayed
    expect(screen.getByText('Fluency & Coherence')).toBeInTheDocument();
    
    // 8. Navigate between report tabs
    const pronunciationTab = screen.getByText('Pronunciation');
    fireEvent.click(pronunciationTab);
    
    // Verify pronunciation tab content
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    
    // Complete test with verification of critical data display
    expect(screen.getByText('85')).toBeInTheDocument(); // The overall score from mock data
  });
  
  test('Handles retry assignment flow', async () => {
    // Start with a submitted assignment
    mockClassContextValue.submissions = [{
      ...mockSubmission,
      status: 'submitted',
      submittedAt: '2025-04-15T12:00:00Z',
      answers: [
        { questionId: 0, audioUrl: 'https://example.com/audio/recording1.webm' },
        { questionId: 1, audioUrl: 'https://example.com/audio/recording2.webm' }
      ]
    }];
    
    // Render submission view
    renderWithRouter('/submission/submission-123');
    
    // Verify submission page loaded
    expect(screen.getByText('Speaking Exercise')).toBeInTheDocument();
    
    // Click retry button
    const retryButton = screen.getByText('Retry Assignment');
    fireEvent.click(retryButton);
    
    // Verify createNewSubmission was called
    await waitFor(() => {
      expect(mockClassContextValue.createNewSubmission).toHaveBeenCalledWith('assignment-123');
    });
    
    // Verify successful toast
    expect(toast.success).toHaveBeenCalledWith('New attempt created!');
  });
  
  test('Loads and properly displays multiple report tabs', async () => {
    // Setup with a submitted assignment
    mockClassContextValue.submissions = [{
      ...mockSubmission,
      status: 'submitted',
      submittedAt: '2025-04-15T12:00:00Z',
      answers: [
        { questionId: 0, audioUrl: 'https://example.com/audio/recording1.webm' },
        { questionId: 1, audioUrl: 'https://example.com/audio/recording2.webm' }
      ]
    }];
    
    // Render submission view
    renderWithRouter('/submission/submission-123');
    
    // Go to report view
    const reportButton = screen.getByText('Speaking Report');
    fireEvent.click(reportButton);
    
    // Fast-forward loading
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    // Wait for report to load
    await waitFor(() => {
      expect(screen.queryByText('Loading Pronunciation Report')).not.toBeInTheDocument();
    });
    
    // Test each tab
    // 1. First check we're on Fluency tab (default)
    expect(screen.getByText('Fluency & Coherence Analysis')).toBeInTheDocument();
    
    // 2. Click Vocabulary tab
    const vocabularyTab = screen.getByText('Lexical Resource');
    fireEvent.click(vocabularyTab);
    
    // Verify tab switched
    expect(screen.getByText('Vocabulary Enhancement')).toBeInTheDocument();
    
    // 3. Click Grammar tab
    const grammarTab = screen.getByText('Grammatical Range & Accuracy');
    fireEvent.click(grammarTab);
    
    // Verify tab switched
    expect(screen.getByText('Grammar Analysis')).toBeInTheDocument();
    
    // 4. Click Pronunciation tab
    const pronunciationTab = screen.getByText('Pronunciation');
    fireEvent.click(pronunciationTab);
    
    // Verify tab switched
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });
});