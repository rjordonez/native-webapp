import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { Class, Assignment, Submission } from "@/types/user";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClassContextType {
  classes: Class[];
  assignments: Assignment[];
  submissions: Submission[];
  loading: boolean;
  submissionsLoading: boolean;
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
  refreshSubmissions: () => Promise<void>;
  getPendingAssignments: (studentId: string) => Assignment[];
  getCompletedAssignments: (studentId: string) => Assignment[];
}

const ClassContext = createContext<ClassContextType>({
  classes: [],
  assignments: [],
  submissions: [],
  loading: true,
  submissionsLoading: false,
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
  refreshSubmissions: async () => {},
  getPendingAssignments: () => [],
  getCompletedAssignments: () => [], 
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);
  const { user, profile } = useAuth();

  const loadSubmissions = useCallback(async (userId: string) => {
    setSubmissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, assignment_id, student_id, status, answers, feedback, submitted_at')
        .eq('student_id', userId);
      
      if (error) throw error;
      
      if (data) {
        const transformedSubmissions = data.map(s => ({
          id: s.id.toString(),
          assignmentId: s.assignment_id.toString(),
          studentId: s.student_id,
          status: s.status as "not_started" | "in_progress" | "submitted",
          answers: s.answers as Array<{ questionId: number; audioUrl?: string }>,
          feedback: s.feedback as { comment?: string; reviewed?: boolean } | undefined,
          submittedAt: s.submitted_at
        }));
        setSubmissions(transformedSubmissions);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (classIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', classIds);
      
      if (error) throw error;
      
      if (data) {
        setAssignments(data.map(a => ({
          id: a.id.toString(),
          classId: a.course_id,
          title: a.title,
          dueDate: a.due_date || "",
          topic: a.topic || "",
          questions: a.questions,
          createdAt: a.created_at || new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    }
  }, []);

  const loadClasses = useCallback(async (userId: string, role: string) => {
    try {
      if (role === 'teacher') {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', userId);
        
        if (error) throw error;
        
        if (data) {
          const transformedClasses = await Promise.all(data.map(async c => {
            const { data: studentsData } = await supabase
              .from('students_classes')
              .select('student_id')
              .eq('class_id', c.id);
            
            return {
              id: c.id,
              name: c.name,
              code: c.class_code,
              teacherId: c.teacher_id,
              students: studentsData?.map(s => s.student_id) || []
            };
          }));
          
          setClasses(transformedClasses);
          return transformedClasses;
        }
      } else {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('students_classes')
          .select('class_id')
          .eq('student_id', userId);
        
        if (enrollmentsError) throw enrollmentsError;
        
        if (enrollments) {
          const classIds = enrollments.map(e => e.class_id);
          const { data: studentClasses, error: studentClassesError } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          
          if (studentClassesError) throw studentClassesError;
          
          if (studentClasses) {
            const transformedClasses = studentClasses.map(c => ({
              id: c.id,
              name: c.name,
              code: c.class_code,
              teacherId: c.teacher_id,
              students: [userId]
            }));
            
            setClasses(transformedClasses);
            return transformedClasses;
          }
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
      return [];
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user || !profile) return;
    
    try {
      setLoading(true);
      const loadedClasses = await loadClasses(user.id, profile.role);
      
      if (loadedClasses.length > 0) {
        const classIds = loadedClasses.map(c => c.id);
        await loadAssignments(classIds);
        
        if (profile.role === 'student') {
          await loadSubmissions(user.id);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [user, profile, loadClasses, loadAssignments, loadSubmissions]);

  useEffect(() => {
    if (user && profile) {
      loadUserData();
    } else if (!user) {
      // Only reset if actually logging out
      setClasses([]);
      setAssignments([]);
      setSubmissions([]);
      setLoading(false);
    }
  }, [user, profile, loadUserData]);

  const refreshSubmissions = useCallback(async () => {
    if (user?.id) {
      await loadSubmissions(user.id);
    }
  }, [user, loadSubmissions]);

  const updateSubmission = useCallback(async (submission: Submission) => {
    if (!user) return;
    
    try {
      let submissionId: string | undefined;
      
      // Check for existing submission
      const { data: existingData } = await supabase
        .from('submissions')
        .select('id')
        .eq('assignment_id', parseInt(submission.assignmentId))
        .eq('student_id', submission.studentId)
        .maybeSingle();
      
      if (existingData) {
        // Update existing
        const { error } = await supabase
          .from('submissions')
          .update({
            status: submission.status,
            answers: submission.answers,
            submitted_at: submission.status === 'submitted' ? new Date().toISOString() : null,
            feedback: submission.feedback
          })
          .eq('id', existingData.id);
        
        if (error) throw error;
        submissionId = existingData.id.toString();
      } else {
        // Create new
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: parseInt(submission.assignmentId),
            student_id: submission.studentId,
            status: submission.status,
            answers: submission.answers,
            submitted_at: submission.status === 'submitted' ? new Date().toISOString() : null,
            feedback: submission.feedback
          })
          .select()
          .single();
        
        if (error) throw error;
        submissionId = data.id.toString();
      }
      
      // Refresh to get latest state
      await refreshSubmissions();
      
      toast.success(
        submission.status === 'submitted' 
          ? "Assignment submitted successfully!" 
          : "Progress saved"
      );
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update submission', { 
        description: error.message || 'Please try again' 
      });
    }
  }, [user, refreshSubmissions]);

  const getPendingAssignments = useCallback((studentId: string): Assignment[] => {
    if (!studentId) return [];
    return assignments.filter(assignment => {
      const submission = submissions.find(s => 
        s.assignmentId === assignment.id && 
        s.studentId === studentId
      );
      return !submission || submission.status !== "submitted";
    });
  }, [assignments, submissions]);

  const getCompletedAssignments = useCallback((studentId: string): Assignment[] => {
    if (!studentId) return [];
    return assignments.filter(assignment => {
      const submission = submissions.find(s => 
        s.assignmentId === assignment.id && 
        s.studentId === studentId
      );
      return submission?.status === "submitted";
    });
  }, [assignments, submissions]);

  // ... (other existing methods remain unchanged) ...

  return (
    <ClassContext.Provider 
      value={{ 
        classes,
        assignments,
        submissions,
        loading,
        submissionsLoading,
        createClass: async (name: string) => {
          if (!user) return;
          try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const { data, error } = await supabase
              .from('classes')
              .insert({ name, class_code: code, teacher_id: user.id })
              .select()
              .single();
            
            if (error) throw error;
            
            if (data) {
              setClasses(prev => [...prev, {
                id: data.id,
                name: data.name,
                code: data.class_code,
                teacherId: data.teacher_id,
                students: [],
              }]);
              toast.success(`Class created with code: ${code}`);
            }
          } catch (error: any) {
            console.error('Error creating class:', error);
            toast.error('Error creating class', { description: error.message });
          }
        },
        joinClass: async (code: string) => {
          if (!user) return false;
          try {
            const { data: classData, error: classError } = await supabase
              .from('classes')
              .select('*')
              .eq('class_code', code)
              .single();
            
            if (classError) throw classError;
            
            // Check if already joined
            const { data: existing } = await supabase
              .from('students_classes')
              .select('*')
              .eq('class_id', classData.id)
              .eq('student_id', user.id);
            
            if (existing && existing.length > 0) {
              toast.info("Already joined this class");
              return true;
            }
            
            // Join class
            const { error: joinError } = await supabase
              .from('students_classes')
              .insert({ class_id: classData.id, student_id: user.id });
            
            if (joinError) throw joinError;
            
            // Update local state
            setClasses(prev => {
              const existingClass = prev.find(c => c.id === classData.id);
              if (existingClass) {
                return prev.map(c => 
                  c.id === classData.id 
                    ? { ...c, students: [...c.students, user.id] } 
                    : c
                );
              }
              return [...prev, {
                id: classData.id,
                name: classData.name,
                code: classData.class_code,
                teacherId: classData.teacher_id,
                students: [user.id],
              }];
            });
            
            toast.success("Class joined successfully!");
            return true;
          } catch (error: any) {
            console.error('Error joining class:', error);
            toast.error('Error joining class', { description: error.message });
            return false;
          }
        },
        getClassesByUser: () => classes,
        createAssignment: async (
          classId: string, 
          title: string, 
          dueDate: string, 
          topic: string, 
          questions: string[]
        ) => {
          if (!user || profile?.role !== "teacher") return;
          try {
            const { data, error } = await supabase
              .from('assignments')
              .insert({
                course_id: classId,
                title,
                questions,
                due_date: dueDate,
                topic,
                created_by: user.id
              })
              .select()
              .single();
            
            if (error) throw error;
            
            if (data) {
              setAssignments(prev => [...prev, {
                id: data.id.toString(),
                classId: data.course_id,
                title: data.title,
                dueDate: data.due_date || dueDate,
                topic: data.topic || topic,
                questions: data.questions,
                createdAt: data.created_at || new Date().toISOString(),
              }]);
              toast.success("Assignment created successfully");
            }
          } catch (error: any) {
            console.error('Error creating assignment:', error);
            toast.error('Failed to create assignment', { description: error.message });
          }
        },
        getAssignmentsByClass: (classId: string) => 
          assignments.filter(a => a.classId === classId),
        getSubmissionsByAssignment: (assignmentId: string) => 
          submissions.filter(s => s.assignmentId === assignmentId),
        getAssignmentStats: (assignmentId: string) => {
          const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId);
          return {
            total: assignmentSubmissions.length,
            submitted: assignmentSubmissions.filter(s => s.status === "submitted").length,
            inProgress: assignmentSubmissions.filter(s => s.status === "in_progress").length,
            notStarted: assignmentSubmissions.filter(s => s.status === "not_started").length,
          };
        },
        updateSubmission,
        updateSubmissionFeedback: async (submissionId: string, comment: string, reviewed: boolean) => {
          setSubmissions(prev => 
            prev.map(s => s.id === submissionId ? { 
              ...s, 
              feedback: { comment, reviewed } 
            } : s)
          );
          toast("Feedback saved successfully");
        },
        uploadAudio: async (assignmentId: string, questionId: number, audioBlob: Blob) => {
          if (!user) return null;
          try {
            const filePath = `${user.id}/${assignmentId}/${questionId}_${Date.now()}.webm`;
            const { data, error } = await supabase
              .storage
              .from('audio_recordings')
              .upload(filePath, audioBlob, {
                cacheControl: '3600',
                upsert: true
              });
            
            if (error) throw error;
            
            if (data) {
              const { data: publicUrlData } = supabase
                .storage
                .from('audio_recordings')
                .getPublicUrl(data.path);
              
              return publicUrlData.publicUrl;
            }
            return null;
          } catch (error: any) {
            console.error('Error uploading audio:', error);
            toast.error('Error uploading audio', { description: error.message });
            return null;
          }
        },
        refreshSubmissions,
        getPendingAssignments,
        getCompletedAssignments,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};