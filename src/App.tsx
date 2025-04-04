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
import ClassDetails from "./pages/ClassDetails";
import CreateAssignment from "./pages/CreateAssignment";
import AssignmentDetails from "./pages/AssignmentDetails";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ 
  children, 
  requiredRole, 
}: { 
  children: React.ReactNode;
  requiredRole?: "teacher" | "student"; 
}) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} />;
  }
  
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
      
      <Route path="/teacher" element={
        <ProtectedRoute requiredRole="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/create-class" element={
        <ProtectedRoute requiredRole="teacher">
          <CreateClass />
        </ProtectedRoute>
      } />
      
      <Route path="/class/:id" element={
        <ProtectedRoute requiredRole="teacher">
          <ClassDetails />
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
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ClassProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ClassProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
