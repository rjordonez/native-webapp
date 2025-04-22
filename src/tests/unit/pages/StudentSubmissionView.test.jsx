import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentSubmissionView from '@/pages/StudentSubmissionView';
import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import posthog from 'posthog-js';

// Mock required dependencies
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn()
}));

jest.mock('@/context/ClassContext', () => ({
  useClass: jest.fn()
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        download: jest.fn()
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    })
  }
}));

jest.mock('posthog-js', () => ({
  capture: jest.fn()
}));

jest.mock('@/components/AppNavbar', () => {
  return function MockedNavbar() {
    return <div data-testid="app-navbar">Navbar</div>;
  };
});

// Add missing globals for the test environment
global.Response = class Response {
  constructor(body, options = {}) {
    this._body = body;
    this._status = options.status || 200;
    this._headers = options.headers || {};
  }

  json() {
    return Promise.resolve(JSON.parse(this._body));
  }

  text() {
    return Promise.resolve(this._body);
  }
};

describe('StudentSubmissionView', () => {
  const mockNavigate = jest.fn();
  
  const mockAssignment = {
    id: 'assignment-123',
    title: 'Speaking Exercise',
    topic: 'English Practice',
    dueDate: '2025-05-01T00:00:00Z',
    questions: [
      'Describe your hometown',
      '{"question":"Talk about your favorite hobby","example":"- How often\\n- Why you enjoy it"}'
    ]
  };
  
  const mockSubmission = {
    id: 'submission-123',
    assignmentId: 'assignment-123',
    studentId: 'user-123',
    submission_uid: 'unique-submission-123',
    submittedAt: '2025-04-15T00:00:00Z',
    status: 'submitted',
    answers: [
      { questionId: 0, audioUrl: 'url-for-question-0' },
      { questionId: 1, audioUrl: 'url-for-question-1' }
    ],
    feedback: null
  };

  const mockSubmissionWithFeedback = {
    ...mockSubmission,
    feedback: {
      reviewed: true,
      comment: 'Great job! Your pronunciation has improved.'
    }
  };

  const mockAnalysisReport = {
    submission_id: 'unique-submission-123',
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
        url: 'url-for-question-0'
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
        url: 'url-for-question-1'
      }
    ],
    grammar_analysis: {},
    vocabulary_suggestions: {},
    fluency_coherence_analysis: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    useParams.mockReturnValue({ id: 'submission-123' });
    useNavigate.mockReturnValue(mockNavigate);
    
    useAuth.mockReturnValue({
      profile: { id: 'user-123', name: 'Test Student' }
    });
    
    useClass.mockReturnValue({
      assignments: [mockAssignment],
      submissions: [mockSubmission]
    });
  
    // Mock supabase user query
    supabase.from().select().eq().single.mockResolvedValue({
      data: { name: 'Test Student' },
      error: null
    });
  
    // Create a Blob with a text() method for the test environment
    const mockBlob = {
      text: jest.fn().mockResolvedValue(JSON.stringify(mockAnalysisReport))
    };
    
    // Mock supabase storage with proper Blob
    supabase.storage.from().download.mockResolvedValue({
      data: mockBlob,
      error: null
    });
    
    // Mock setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders submission details correctly', async () => {
    render(<StudentSubmissionView />);
    
    // Fast-forward through any setTimeout
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Speaking Exercise')).toBeInTheDocument();
      expect(screen.getByText('English Practice')).toBeInTheDocument();
      expect(screen.getByText(/Submitted on: April \d+, 2025/)).toBeInTheDocument();
    });
    
    // Check if questions are rendered
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Describe your hometown')).toBeInTheDocument();
    
    // Check if audio elements are present
    const audioElements = document.querySelectorAll('audio');
    expect(audioElements.length).toBe(2);
  });

  test('displays feedback when available', async () => {
    useClass.mockReturnValue({
      assignments: [mockAssignment],
      submissions: [mockSubmissionWithFeedback]
    });
    
    render(<StudentSubmissionView />);
    
    // Fast-forward through any setTimeout
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Feedback Available')).toBeInTheDocument();
      const feedbackLabels = screen.getAllByText('Teacher Feedback');
      expect(feedbackLabels.length).toBeGreaterThan(0);
      // Use getAllByText instead of getByText since there are multiple elements with this text
      const feedbackTexts = screen.getAllByText('Great job! Your pronunciation has improved.');
      expect(feedbackTexts.length).toBeGreaterThan(0);
    });
  });

  test('toggles between submission view and report view', async () => {
    render(<StudentSubmissionView />);
    
    // Fast-forward through loading with act
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('View Submission')).toBeInTheDocument();
      expect(screen.getByText('Speaking Report')).toBeInTheDocument();
    });
    
    // Default should be submission view
    expect(screen.getByText('Question 1')).toBeInTheDocument();
    
    // Click on Speaking Report button
    fireEvent.click(screen.getByText('Speaking Report'));
    
    // Should show loading state first
    expect(screen.getByText('Loading Pronunciation Report')).toBeInTheDocument();
    
    // Fast-forward through report loading and make sure the mock resolves
    act(() => {
      jest.advanceTimersByTime(1100);
      // Ensure all promises resolve
      jest.runAllTimers();
    });
    
    // Since we're using proper mocking, we need to wait for the analysis report to be processed
    await waitFor(() => {
      // This will wait until either condition is met (either the report is loaded or it's still loading)
      expect(screen.queryByText('Loading Pronunciation Report')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Go back to submission view
    fireEvent.click(screen.getByText('View Submission'));
    
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
  });

  test('handles parsed question data with examples', async () => {
    render(<StudentSubmissionView />);
    
    // Fast-forward through loading
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
      expect(screen.getByText('Talk about your favorite hobby')).toBeInTheDocument();
    });
    
    // Check if View Example button exists for question 2
    const viewExampleButton = screen.getByText('View Example');
    expect(viewExampleButton).toBeInTheDocument();
    
    // Click to show example
    fireEvent.click(viewExampleButton);
    
    // Check if example content is visible
    expect(screen.getByText('Cue Card')).toBeInTheDocument();
  });

  test('navigates back to dashboard', async () => {
    render(<StudentSubmissionView />);
    
    // Fast-forward through loading
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    
    await waitFor(() => {
      const backButton = screen.getByText('Back to Dashboard');
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/student');
    });
  });

  test('shows not found message when submission does not exist', () => {
    useClass.mockReturnValue({
      assignments: [mockAssignment],
      submissions: [] // Empty submissions array
    });
    
    render(<StudentSubmissionView />);
    
    expect(screen.getByText('Submission not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
  });
});