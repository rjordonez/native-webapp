import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeacherDashboard from '@/pages/TeacherDashboard';
import { ClassProvider } from '@/context/ClassContext';
import { AuthProvider } from '@/context/AuthContext';

// Mock supabase to avoid actual API calls
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn(callback => Promise.resolve(callback({ data: [], error: null })))
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: null, error: null })
      })
    }
  }
}));

// Mock auth context
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: 'user-123' },
    profile: { id: 'user-123', name: 'Test Teacher', role: 'teacher' }
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

describe('TeacherDashboard Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders dashboard with teacher header', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ClassProvider>
            <MemoryRouter initialEntries={['/dashboard']}>
              <Routes>
                <Route path="/dashboard" element={<TeacherDashboard />} />
              </Routes>
            </MemoryRouter>
          </ClassProvider>
        </AuthProvider>
      );
    });

    // Run any pending timers
    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      // Check for basic elements that should always be present
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Create New Class')).toBeInTheDocument();
    });
  });

  test('shows empty state when no classes exist', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <ClassProvider>
            <MemoryRouter initialEntries={['/dashboard']}>
              <TeacherDashboard />
            </MemoryRouter>
          </ClassProvider>
        </AuthProvider>
      );
    });

    // Run any pending timers
    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText('No classes created yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first class to get started.')).toBeInTheDocument();
      expect(screen.getByText('Create Class')).toBeInTheDocument();
    });
  });
});
