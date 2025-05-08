import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ClassProvider } from "@/context/ClassContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CreateClass from "./pages/CreateClass";
import JoinClass from "./pages/JoinClass";
import CreateAssignment from "./pages/CreateAssignment";
import AssignmentDetails from "./pages/AssignmentDetails";
import StudentClassView from "./pages/StudentClassView";
import StudentAssignmentDetails from "./pages/StudentAssignmentDetails";
import StudentSubmissionView from "./pages/StudentSubmissionView";
import ClassStudentsView from "./pages/ClassStudentsView";
import VoiceAnalysisBenchmarkPage from "./pages/VoiceAnalysisBenchmarkPage";
import UnfinishedReportsPage from "./pages/UnfinishedReports";
import TeacherClassesPage from "./pages/TeacherClassesPage";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: "teacher" | "student";
}) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === "teacher" ? "/teacher" : "/student"} />;
  }

  return <>{children}</>;
};
const PostHogCaptureWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    posthog.capture('$pageview');
  }, [location.pathname]);

  return <>{children}</>;
};
const AppRoutes = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={
        user ? (
          <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} />
        ) : (
          <Index />
        )
      } />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Teacher routes */}
      <Route path="/teacher" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      {/* Add the new route here */}
      <Route path="/teacher/class/:classId" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/create-class" element={
        <ProtectedRoute requiredRole="teacher">
          <CreateClass />
        </ProtectedRoute>
      } />
      
      
      <Route path="/class/:id/students" element={
        <ProtectedRoute requiredRole="teacher">
          <ClassStudentsView />
        </ProtectedRoute>
      } />

      <Route path="/create-assignment" element={
        <ProtectedRoute requiredRole="teacher">
          <CreateAssignment />
        </ProtectedRoute>
      } />
      
      <Route path="/assignment/:id" element={
        <ProtectedRoute requiredRole="teacher">
          <AssignmentDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/teacher/submission/:id" element={
        <ProtectedRoute requiredRole="teacher">
          <StudentSubmissionView />
        </ProtectedRoute>
      } />
      
      {/* Student routes */}
      <Route path="/student" element={
        <ProtectedRoute requiredRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/join-class" element={
        <ProtectedRoute requiredRole="student">
          <JoinClass />
        </ProtectedRoute>
      } />
      
      <Route path="/student/class/:id" element={
        <ProtectedRoute requiredRole="student">
          <StudentClassView />
        </ProtectedRoute>
      } />
      
      <Route path="/student/assignment/:id" element={
        <ProtectedRoute requiredRole="student">
          <StudentAssignmentDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/student/submission/:id" element={
        <ProtectedRoute requiredRole="student">
          <StudentSubmissionView />
        </ProtectedRoute>
      } />
      {/* Dev routes */}
      <Route path="/dev" element={
          <VoiceAnalysisBenchmarkPage />
      } /> 

      <Route path="/unfinished-reports" element={<UnfinishedReportsPage />} />
      <Route path="/teacher-dev" element={<TeacherClassesPage />} />



      <Route path="*" element={<NotFound />} />

    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string, {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      session_recording: {
        maskAllInputs: true,
        recordCrossOriginIframes: true,
        captureCanvas: {
          recordCanvas: true
        }
      }, 
      loaded: (ph) => {
        if (import.meta.env.DEV) ph.debug()
      }
    })
    
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ClassProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PostHogCaptureWrapper>
                  <AppRoutes />
                </PostHogCaptureWrapper>
              </BrowserRouter>
            </ClassProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
};
export default App;