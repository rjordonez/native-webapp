import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherDashboard from '@/pages/TeacherDashboard';
import { useParams, useNavigate } from 'react-router-dom';
import { useClass } from '@/context/ClassContext';

// Mock all required dependencies
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock('@/context/ClassContext', () => ({
  useClass: jest.fn(),
}));

jest.mock('@/components/AppNavbar', () => {
  return function MockedNavbar() {
    return <div data-testid="app-navbar">Navbar</div>;
  };
});

describe('TeacherDashboard', () => {
  const mockNavigate = jest.fn();
  
  // Mock classes data
  const mockClasses = [
    {
      id: 'class-123',
      name: 'English 101',
      code: 'ABC123',
      students: [
        { id: 'student-1', name: 'John Doe' },
        { id: 'student-2', name: 'Jane Smith' }
      ]
    },
    {
      id: 'class-456',
      name: 'Math 202',
      code: 'XYZ789',
      students: [
        { id: 'student-3', name: 'Bob Johnson' }
      ]
    }
  ];

  // Mock assignments data
  const mockAssignments = [
    {
      id: 'assignment-123',
      title: 'Grammar Exercise',
      topic: 'Past Tense',
      dueDate: '2025-05-01T00:00:00Z',
      classId: 'class-123'
    },
    {
      id: 'assignment-456',
      title: 'Calculus Quiz',
      topic: 'Derivatives',
      dueDate: '2025-05-10T00:00:00Z',
      classId: 'class-456'
    }
  ];

  // Mock submissions data
  const mockSubmissions = [
    {
      id: 'submission-123',
      assignmentId: 'assignment-123',
      studentId: 'student-1',
      status: 'submitted',
      submittedAt: '2025-04-15T00:00:00Z'
    }
  ];

  // Mock assignment stats
  const mockStats = {
    submitted: 1,
    inProgress: 1
  };

  // Setup for tests
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up router mocks
    useParams.mockReturnValue({ classId: undefined });
    useNavigate.mockReturnValue(mockNavigate);
    
    // Mock class context
    useClass.mockReturnValue({
      getClassesByUser: jest.fn().mockReturnValue(mockClasses),
      getAssignmentsByClass: jest.fn().mockImplementation((classId) => {
        return mockAssignments.filter(a => a.classId === classId);
      }),
      getAssignmentStats: jest.fn().mockResolvedValue(mockStats),
      getStudentsByClass: jest.fn().mockImplementation((classId) => {
        const classData = mockClasses.find(c => c.id === classId);
        return Promise.resolve(classData ? classData.students : []);
      }),
      getAssignmentSubmissions: jest.fn().mockResolvedValue(mockSubmissions),
      getClassById: jest.fn().mockImplementation((classId) => {
        return mockClasses.find(c => c.id === classId);
      }),
      deleteAssignment: jest.fn().mockResolvedValue(true),
      loading: false
    });
  });

  // Test rendering dashboard with class list
  test('renders dashboard with class list when no classId is provided', async () => {
    const { container } = render(<TeacherDashboard />);
    
    // Wait for state updates to complete
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    });
    
    // Check for class cards
    expect(screen.getByText('English 101')).toBeInTheDocument();
    expect(screen.getByText('Math 202')).toBeInTheDocument();
    expect(screen.getByText('Class Code: ABC123')).toBeInTheDocument();
    expect(screen.getByText('Class Code: XYZ789')).toBeInTheDocument();
    
    // Check for navigation buttons
    expect(screen.getByText('Create New Class')).toBeInTheDocument();
    expect(screen.getByText('Create Assignment')).toBeInTheDocument();
  });

  // Test navigation to create class page
  test('navigates to create class page when Create New Class is clicked', async () => {
    render(<TeacherDashboard />);
    
    // Wait for rendering to complete
    await waitFor(() => {
      expect(screen.getByText('Create New Class')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Create New Class'));
    expect(mockNavigate).toHaveBeenCalledWith('/create-class');
  });

  // Test navigation to create assignment page
  test('navigates to create assignment page when Create Assignment is clicked', async () => {
    render(<TeacherDashboard />);
    
    // Wait for rendering to complete
    await waitFor(() => {
      expect(screen.getByText('Create Assignment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Create Assignment'));
    expect(mockNavigate).toHaveBeenCalledWith('/create-assignment');
  });

  // Test rendering class detail view
  test('renders class detail view when classId is provided', async () => {
    // Update params mock to include classId
    useParams.mockReturnValue({ classId: 'class-123' });
    
    render(<TeacherDashboard />);
    
    // Wait for the class details to load
    await waitFor(() => {
      expect(useClass().getClassById).toHaveBeenCalledWith('class-123');
    });
    
    // Check for class name in detail view
    expect(screen.getByText('English 101')).toBeInTheDocument();
    
    // Check for Back to Dashboard button
    const backButton = screen.getByText('← Back to Dashboard');
    expect(backButton).toBeInTheDocument();
    
    // Check for New Assignment button
    expect(screen.getByText('New Assignment')).toBeInTheDocument();
  });

  // Test going back to dashboard
  test('goes back to dashboard when Back button is clicked', async () => {
    useParams.mockReturnValue({ classId: 'class-123' });
    
    render(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('← Back to Dashboard'));
    
    // Wait for state to update
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    });
  });

  // Test navigation to create assignment page from class view
  test('navigates to create assignment page with class ID', async () => {
    useParams.mockReturnValue({ classId: 'class-123' });
    
    render(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('New Assignment')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('New Assignment'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/create-assignment', { state: { classId: 'class-123' } });
  });

  // Test showing loading state when class context is loading
  test('shows loading state when class context is loading', async () => {
    useClass.mockReturnValue({
      ...useClass(),
      loading: true
    });
    
    render(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  // Test showing empty state when no classes exist
  test('shows empty state when no classes exist', async () => {
    useClass.mockReturnValue({
      ...useClass(),
      getClassesByUser: jest.fn().mockReturnValue([])
    });
    
    render(<TeacherDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No classes created yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first class to get started.')).toBeInTheDocument();
    });
  });

  // Test View Details button
  test('displays View Details button for each class', async () => {
    render(<TeacherDashboard />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      expect(viewDetailsButtons.length).toBe(2); // Two classes
    });
  });
});