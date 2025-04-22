// Mock the AppNavbar component first
jest.mock('@/components/AppNavbar', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-navbar">Mock Navbar</div>
  };
});

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockReturnValue({ id: 'test-id' }),
  useNavigate: jest.fn().mockReturnValue(jest.fn())
}));

// Mock context providers
jest.mock('@/context/ClassContext', () => ({
  useClass: jest.fn()
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock API service
jest.mock('@/lib/api-services', () => ({
  sendToAnalysisAPI: jest.fn()
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn().mockImplementation(() => 'January 1, 2025')
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn().mockReturnValue('mock-toast-id'),
    dismiss: jest.fn()
  }
}));

// Mock browser APIs that are not available in Jest
beforeAll(() => {
  // Mock MediaRecorder
  global.MediaRecorder = class MockMediaRecorder {
    constructor() {
      this.state = 'inactive';
      this.stream = {
        getTracks: () => [{stop: jest.fn()}]
      };
    }
    
    start() {
      this.state = 'recording';
      if (this.ondataavailable) {
        const event = { data: new Blob([], { type: 'audio/webm' }) };
        this.ondataavailable(event);
      }
    }
    
    stop() {
      this.state = 'inactive';
      if (this.onstop) {
        this.onstop();
      }
    }
    
    addEventListener(event, handler) {
      if (event === 'dataavailable') {
        this.ondataavailable = handler;
      } else if (event === 'stop') {
        this.onstop = handler;
      }
    }
  };
  
  // Mock navigator.mediaDevices
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockImplementation(() => 
        Promise.resolve({
          getTracks: () => [{ stop: jest.fn() }]
        })
      )
    },
    configurable: true
  });
  
  // Mock Blob
  if (!global.Blob) {
    global.Blob = class MockBlob {
      constructor(content, options) {
        this.content = content;
        this.options = options;
        this.size = content.length > 0 ? 100 : 0; // Arbitrary size
      }
    };
  }
  
  // Mock document.hidden and visibility events
  Object.defineProperty(document, 'hidden', {
    value: false,
    writable: true
  });
  
  document.addEventListener = jest.fn().mockImplementation((event, handler) => {
    if (event === 'visibilitychange') {
      // Store the handler for trigger if needed
    }
  });
  
  document.removeEventListener = jest.fn();
});

// Import React and testing library
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentAssignmentDetails from '@/pages/StudentAssignmentDetails';

describe('StudentAssignmentDetails', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup minimal mock data for loading state
    const { useClass } = require('@/context/ClassContext');
    useClass.mockReturnValue({
      assignments: [],
      submissions: [],
      getClassesByUser: jest.fn().mockReturnValue([]),
      loading: true
    });
    
    const { useAuth } = require('@/context/AuthContext');
    useAuth.mockReturnValue({
      user: null
    });
  });
  
  test('renders loading state', () => {
    render(<StudentAssignmentDetails />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  test('renders assignment details when data is loaded', () => {
    const { useClass } = require('@/context/ClassContext');
    useClass.mockReturnValue({
      assignments: [
        {
          id: 'test-id',
          title: 'Test Assignment',
          description: 'This is a test assignment',
          dueDate: '2025-01-01',
          points: 100,
          questions: ['Test question 1?'], // Add questions array to prevent error
          topic: 'Test Topic',
          classId: 'class-id',
          metadata: JSON.stringify({
            questionsWithTimeLimits: [
              {
                question: 'Test question 1?',
                timeLimit: '60',
                example: 'This is an example'
              }
            ]
          })
        }
      ],
      submissions: [],
      getClassesByUser: jest.fn().mockReturnValue([{ id: 'class-id', name: 'Test Class' }]),
      loading: false,
      uploadAudio: jest.fn().mockResolvedValue('https://example.com/audio.mp3'),
      updateSubmission: jest.fn().mockResolvedValue({})
    });

    const { useAuth } = require('@/context/AuthContext');
    useAuth.mockReturnValue({
      user: {
        id: 'user-id',
        name: 'Test User',
      }
    });

    render(<StudentAssignmentDetails />);

    // Check for assignment details
    expect(screen.getByText('Test Assignment')).toBeInTheDocument();
    expect(screen.getByText('Test Topic')).toBeInTheDocument();
    expect(screen.getByText('January 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('1 question')).toBeInTheDocument();
    expect(screen.getByText('Class: Test Class')).toBeInTheDocument();
  });

  // Add more test cases as needed
});