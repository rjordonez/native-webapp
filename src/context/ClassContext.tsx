
import React, { createContext, useState, useContext, useEffect } from "react";
import { Class, Assignment, Submission, mockStudents, mockTopics, mockQuestions } from "@/types/user";
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
  updateSubmission: (submission: Submission) => void;
  updateSubmissionFeedback: (submissionId: string, comment: string, reviewed: boolean) => void;
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
  updateSubmission: () => {},
  updateSubmissionFeedback: () => {},
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const { user } = useAuth();

  useEffect(() => {
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

  // Generate mock data for assignments and submissions if none exist
  useEffect(() => {
    if (classes.length > 0 && assignments.length === 0) {
      // Create some mock assignments for existing classes
      const mockAssignments: Assignment[] = [];
      
      classes.forEach(classItem => {
        const topicsToUse = mockTopics.slice(0, 3); // Use first 3 topics
        
        topicsToUse.forEach((topic, index) => {
          const questionsForTopic = mockQuestions[topic as keyof typeof mockQuestions] || [];
          
          mockAssignments.push({
            id: `assignment_${classItem.id}_${index}`,
            classId: classItem.id,
            title: `${topic} Practice ${index + 1}`,
            dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 1, 2, 3 weeks
            topic,
            questions: questionsForTopic,
            createdAt: new Date().toISOString()
          });
        });
      });
      
      if (mockAssignments.length > 0) {
        setAssignments(mockAssignments);
      }
    }
  }, [classes, assignments.length]);

  useEffect(() => {
    if (submissions.length === 0 && assignments.length > 0) {
      const mockSubmissions: Submission[] = [];
      
      assignments.forEach(assignment => {
        const classItem = classes.find(c => c.id === assignment.classId);
        if (!classItem) return;
        
        const classStudents = mockStudents.slice(0, Math.min(8, mockStudents.length));
        
        classStudents.forEach((student, index) => {
          let status: "not_started" | "in_progress" | "submitted";
          let submittedAt: string | undefined;
          
          if (index < classStudents.length * 0.5) {
            status = "submitted";
            const submissionDate = new Date();
            submissionDate.setDate(submissionDate.getDate() - Math.floor(Math.random() * 7) - 1);
            submittedAt = submissionDate.toISOString();
          } else if (index < classStudents.length * 0.75) {
            status = "in_progress";
            submittedAt = undefined;
          } else {
            status = "not_started";
            submittedAt = undefined;
          }
          
          mockSubmissions.push({
            id: `sub_${assignment.id}_${student.id}`,
            assignmentId: assignment.id,
            studentId: student.id,
            status,
            answers: assignment.questions.map((_, index) => ({
              questionId: index,
              audioUrl: status === "submitted" ? `/mock-audio-${index + 1}.mp3` : undefined
            })),
            submittedAt,
            feedback: status === "submitted" ? {
              comment: index % 3 === 0 ? "Good job! Your pronunciation is clear and natural." : undefined,
              reviewed: index % 3 === 0
            } : undefined
          });
        });
      });
      
      setSubmissions(mockSubmissions);
    }
  }, [assignments, classes, submissions.length]);

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

  const updateSubmission = (submission: Submission) => {
    setSubmissions(prev => 
      prev.map(s => s.id === submission.id ? submission : s)
    );
  };

  const updateSubmissionFeedback = (submissionId: string, comment: string, reviewed: boolean) => {
    setSubmissions(prev => 
      prev.map(s => {
        if (s.id === submissionId) {
          return {
            ...s,
            feedback: {
              comment,
              reviewed
            }
          };
        }
        return s;
      })
    );
    
    toast("Feedback saved successfully");
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
        getAssignmentStats,
        updateSubmission,
        updateSubmissionFeedback
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};
