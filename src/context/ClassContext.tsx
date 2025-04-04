import React, { createContext, useState, useContext, useEffect } from "react";
import { Class, Assignment, Submission, mockStudents, mockTopics, mockQuestions } from "@/types/user";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClassContextType {
  classes: Class[];
  assignments: Assignment[];
  submissions: Submission[];
  loading: boolean;
  createClass: (name: string) => Promise<void>;
  joinClass: (code: string) => Promise<boolean>;
  getClassesByUser: () => Class[];
  createAssignment: (
    classId: string, 
    title: string, 
    dueDate: string, 
    topic: string, 
    questions: string[]
  ) => Promise<void>;
  getAssignmentsByClass: (classId: string) => Assignment[];
  getSubmissionsByAssignment: (assignmentId: string) => Submission[];
  getAssignmentStats: (assignmentId: string) => { 
    total: number; 
    submitted: number; 
    inProgress: number; 
    notStarted: number;
  };
  updateSubmission: (submission: Submission) => Promise<void>;
  updateSubmissionFeedback: (submissionId: string, comment: string, reviewed: boolean) => Promise<void>;
  uploadAudio: (assignmentId: string, questionId: number, audioBlob: Blob) => Promise<string | null>;
}

const ClassContext = createContext<ClassContextType>({
  classes: [],
  assignments: [],
  submissions: [],
  loading: true,
  createClass: async () => {},
  joinClass: async () => false,
  getClassesByUser: () => [],
  createAssignment: async () => {},
  getAssignmentsByClass: () => [],
  getSubmissionsByAssignment: () => [],
  getAssignmentStats: () => ({ total: 0, submitted: 0, inProgress: 0, notStarted: 0 }),
  updateSubmission: async () => {},
  updateSubmissionFeedback: async () => {},
  uploadAudio: async () => null,
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      loadUserData();
    } else {
      // Reset data when not authenticated
      setClasses([]);
      setAssignments([]);
      setSubmissions([]);
      setLoading(false);
    }
  }, [user, profile]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log("Loading classes data for user:", user.id, "with role:", profile?.role);
      
      // For teachers, fetch their classes
      if (profile?.role === 'teacher') {
        const { data: teacherClasses, error: teacherClassesError } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', user.id);
        
        if (teacherClassesError) {
          console.error('Error loading teacher classes:', teacherClassesError);
        } else if (teacherClasses) {
          console.log("Teacher classes loaded:", teacherClasses.length);
          const transformedClasses = teacherClasses.map(c => ({
            id: c.id,
            name: c.name,
            code: c.class_code,
            teacherId: c.teacher_id,
            students: []
          }));
          
          setClasses(transformedClasses);
          
          // Load students for each class
          for (const cls of transformedClasses) {
            const { data: studentsData, error: studentsError } = await supabase
              .from('students_classes')
              .select('student_id')
              .eq('class_id', cls.id);
              
            if (studentsError) {
              console.error('Error loading students for class:', cls.id, studentsError);
            } else if (studentsData) {
              cls.students = studentsData.map(s => s.student_id);
            }
          }
        }
      } 
      // For students, fetch classes they are enrolled in
      else if (profile?.role === 'student') {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('students_classes')
          .select('class_id')
          .eq('student_id', user.id);
        
        if (enrollmentsError) {
          console.error('Error loading student enrollments:', enrollmentsError);
        } else if (enrollments && enrollments.length > 0) {
          const classIds = enrollments.map(e => e.class_id);
          console.log("Student is enrolled in classes:", classIds);
          
          const { data: studentClasses, error: studentClassesError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          
          if (studentClassesError) {
            console.error('Error loading student classes:', studentClassesError);
          } else if (studentClasses) {
            console.log("Student classes loaded:", studentClasses.length);
            const transformedClasses = studentClasses.map(c => ({
              id: c.id,
              name: c.name,
              code: c.class_code,
              teacherId: c.teacher_id,
              students: [user.id]
            }));
            
            setClasses(transformedClasses);
          }
        } else {
          console.log("Student is not enrolled in any classes");
          setClasses([]);
        }
      }
      
      // For now, use mock data for assignments and submissions
      // Later this can be updated to fetch from Supabase
      // For mock data generation, we'll use the existing pattern in useEffects below
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const createClass = async (name: string) => {
    if (!user) return;

    try {
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name,
          class_code: code,
          teacher_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        const newClass: Class = {
          id: data.id,
          name: data.name,
          code: data.class_code,
          teacherId: data.teacher_id,
          students: [],
        };
        
        setClasses(prevClasses => [...prevClasses, newClass]);
        toast.success(`Class created with code: ${code}`);
      }
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast.error('Error creating class', {
        description: error.message
      });
    }
  };

  const joinClass = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log("Attempting to join class with code:", code);
      // Find the class with this code
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('class_code', code)
        .single();
      
      if (classError) {
        console.error('Error finding class with code:', code, classError);
        if (classError.code === 'PGRST116') {
          toast.error("Class not found", {
            description: "Please check the class code and try again."
          });
        } else {
          throw classError;
        }
        return false;
      }
      
      console.log("Found class:", classData);
      
      // Check if already joined
      const { data: existingData, error: existingError } = await supabase
        .from('students_classes')
        .select('*')
        .eq('class_id', classData.id)
        .eq('student_id', user.id);
      
      if (existingError) {
        console.error('Error checking existing enrollment:', existingError);
        throw existingError;
      }
      
      if (existingData && existingData.length > 0) {
        console.log("Student already enrolled in class");
        toast.info("Already joined", {
          description: "You are already a member of this class."
        });
        return true; // Return true because technically they are in the class
      }
      
      // Join the class
      const { error: joinError } = await supabase
        .from('students_classes')
        .insert({
          class_id: classData.id,
          student_id: user.id
        });
      
      if (joinError) {
        console.error('Error joining class:', joinError);
        throw joinError;
      }
      
      console.log("Successfully joined class");
      
      // Update local classes data
      const classToJoin = classes.find(c => c.id === classData.id);
      if (classToJoin) {
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
      } else {
        // If class not in local state yet, add it
        const newClass: Class = {
          id: classData.id,
          name: classData.name,
          code: classData.class_code,
          teacherId: classData.teacher_id,
          students: [user.id],
        };
        
        setClasses(prevClasses => [...prevClasses, newClass]);
      }
      
      toast.success("Class joined successfully!");
      return true;
    } catch (error: any) {
      console.error('Error joining class:', error);
      toast.error('Error joining class', {
        description: error.message
      });
      return false;
    }
  };

  // Helper function to fetch classes by user role (teacher or student)
  const getClassesByUser = (): Class[] => {
    return classes;
  };

  const createAssignment = async (
    classId: string, 
    title: string, 
    dueDate: string, 
    topic: string, 
    questions: string[]
  ) => {
    if (!user || profile?.role !== "teacher") return;

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

  const getAssignmentsByClass = (classId: string): Assignment[] => {
    return assignments.filter(a => a.classId === classId);
  };

  const getSubmissionsByAssignment = (assignmentId: string): Submission[] => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  };

  const getAssignmentStats = (assignmentId: string) => {
    const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId);
    const total = assignmentSubmissions.length;
    const submitted = assignmentSubmissions.filter(s => s.status === "submitted").length;
    const inProgress = assignmentSubmissions.filter(s => s.status === "in_progress").length;
    const notStarted = assignmentSubmissions.filter(s => s.status === "not_started").length;
    
    return { total, submitted, inProgress, notStarted };
  };

  const updateSubmission = async (submission: Submission) => {
    setSubmissions(prev => 
      prev.map(s => s.id === submission.id ? submission : s)
    );
  };

  const updateSubmissionFeedback = async (submissionId: string, comment: string, reviewed: boolean) => {
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

  // Updated uploadAudio to store files in Supabase storage
  const uploadAudio = async (assignmentId: string, questionId: number, audioBlob: Blob): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const filePath = `${user.id}/${assignmentId}/${questionId}_${Date.now()}.webm`;
      console.log("Uploading audio file to path:", filePath);
      
      const { data, error } = await supabase
        .storage
        .from('audio_recordings')
        .upload(filePath, audioBlob, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Error uploading audio to storage:', error);
        throw error;
      }
      
      if (data) {
        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase
          .storage
          .from('audio_recordings')
          .getPublicUrl(data.path);
        
        console.log("File uploaded successfully. Public URL:", publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast.error('Error uploading audio', {
        description: error.message
      });
      return null;
    }
  };

  // Set up mock data if needed
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

  return (
    <ClassContext.Provider 
      value={{ 
        classes, 
        assignments, 
        submissions,
        loading,
        createClass, 
        joinClass, 
        getClassesByUser,
        createAssignment,
        getAssignmentsByClass,
        getSubmissionsByAssignment,
        getAssignmentStats,
        updateSubmission,
        updateSubmissionFeedback,
        uploadAudio
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};
