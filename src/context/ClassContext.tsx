import React, { createContext, useState, useContext, useEffect } from "react";
import { Class, Assignment, Submission } from "@/types/user";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface ClassContextType {
  classes: Class[];
  assignments: Assignment[];
  submissions: Submission[];
  createClass: (name: string) => void;
  joinClass: (code: string) => boolean;
  getClassesByUser: () => Class[];
  createAssignment: (
    classId: string, 
    title: string, 
    dueDate: string, 
    topic: string, 
    questions: string[]
  ) => void;
  getAssignmentsByClass: (classId: string) => Assignment[];
  getSubmissionsByAssignment: (assignmentId: string) => Submission[];
  getAssignmentStats: (assignmentId: string) => { 
    total: number; 
    submitted: number; 
    inProgress: number; 
    notStarted: number;
  };
}

const ClassContext = createContext<ClassContextType>({
  classes: [],
  assignments: [],
  submissions: [],
  createClass: () => {},
  joinClass: () => false,
  getClassesByUser: () => [],
  createAssignment: () => {},
  getAssignmentsByClass: () => [],
  getSubmissionsByAssignment: () => [],
  getAssignmentStats: () => ({ total: 0, submitted: 0, inProgress: 0, notStarted: 0 }),
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Load data from localStorage
    const savedClasses = localStorage.getItem("classes");
    const savedAssignments = localStorage.getItem("assignments");
    const savedSubmissions = localStorage.getItem("submissions");
    
    if (savedClasses) {
      setClasses(JSON.parse(savedClasses));
    }
    if (savedAssignments) {
      setAssignments(JSON.parse(savedAssignments));
    }
    if (savedSubmissions) {
      setSubmissions(JSON.parse(savedSubmissions));
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("classes", JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem("assignments", JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem("submissions", JSON.stringify(submissions));
  }, [submissions]);

  const generateRandomCode = (): string => {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createClass = (name: string) => {
    if (!user) return;

    const code = generateRandomCode();
    const newClass: Class = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      code,
      teacherId: user.id,
      students: [],
    };

    setClasses([...classes, newClass]);
    toast(`Class created with code: ${code}`);
  };

  const joinClass = (code: string): boolean => {
    if (!user) return false;

    const classToJoin = classes.find(c => c.code === code);
    
    if (!classToJoin) {
      toast("Class not found", {
        description: "Please check the class code and try again."
      });
      return false;
    }

    if (classToJoin.students.includes(user.id)) {
      toast("Already joined", {
        description: "You are already a member of this class."
      });
      return false;
    }

    const updatedClasses = classes.map(c => {
      if (c.id === classToJoin.id) {
        return {
          ...c,
          students: [...c.students, user.id]
        };
      }
      return c;
    });

    setClasses(updatedClasses);
    toast("Class joined successfully!");
    return true;
  };

  const getClassesByUser = (): Class[] => {
    if (!user) return [];
    
    if (user.role === "teacher") {
      return classes.filter(c => c.teacherId === user.id);
    } else {
      return classes.filter(c => c.students.includes(user.id));
    }
  };

  const createAssignment = (
    classId: string, 
    title: string, 
    dueDate: string, 
    topic: string, 
    questions: string[]
  ) => {
    if (!user || user.role !== "teacher") return;

    const classObj = classes.find(c => c.id === classId);
    if (!classObj) {
      toast("Class not found");
      return;
    }

    const newAssignment: Assignment = {
      id: Math.random().toString(36).substring(2, 9),
      classId,
      title,
      dueDate,
      topic,
      questions,
      createdAt: new Date().toISOString(),
    };

    setAssignments([...assignments, newAssignment]);
    
    // Create empty submissions for all students in the class
    const newSubmissions = classObj.students.map(studentId => ({
      id: Math.random().toString(36).substring(2, 9),
      assignmentId: newAssignment.id,
      studentId,
      status: "not_started" as const,
      answers: questions.map((_, index) => ({ questionId: index })),
    }));

    setSubmissions([...submissions, ...newSubmissions]);

    toast("Assignment created successfully");
  };

  const getAssignmentsByClass = (classId: string): Assignment[] => {
    return assignments.filter(a => a.classId === classId);
  };

  const getSubmissionsByAssignment = (assignmentId: string): Submission[] => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  };

  const getAssignmentStats = (assignmentId: string) => {
    const assignmentSubmissions = getSubmissionsByAssignment(assignmentId);
    const total = assignmentSubmissions.length;
    const submitted = assignmentSubmissions.filter(s => s.status === "submitted").length;
    const inProgress = assignmentSubmissions.filter(s => s.status === "in_progress").length;
    const notStarted = assignmentSubmissions.filter(s => s.status === "not_started").length;
    
    return { total, submitted, inProgress, notStarted };
  };

  return (
    <ClassContext.Provider 
      value={{ 
        classes, 
        assignments, 
        submissions,
        createClass, 
        joinClass, 
        getClassesByUser,
        createAssignment,
        getAssignmentsByClass,
        getSubmissionsByAssignment,
        getAssignmentStats
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};
