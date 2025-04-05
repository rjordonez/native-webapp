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
  getAssignmentStats: (assignmentId: string) => Promise<{ 
    total: number; 
    submitted: number; 
    inProgress: number; 
    notStarted: number;
  }>;
  updateSubmission: (submission: Submission) => Promise<void>;
  updateSubmissionFeedback: (submissionId: string, comment: string, reviewed: boolean) => Promise<void>;
  uploadAudio: (assignmentId: string, questionId: number, audioBlob: Blob) => Promise<string | null>;
  refreshSubmissions: () => Promise<void>;
  getPendingAssignments: (studentId: string) => Assignment[];
  getCompletedAssignments: (studentId: string) => Assignment[];
  getStudentsByClass: (classId: string) => Promise<{id: string, name: string}[]>;
  getAssignmentSubmissions: (assignmentId: string) => Promise<Submission[]>;
  getClassById: (classId: string) => Promise<Class | null>;
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
  getAssignmentStats: async () => ({ total: 0, submitted: 0, inProgress: 0, notStarted: 0 }),
  updateSubmission: async () => {},
  updateSubmissionFeedback: async () => {},
  uploadAudio: async () => null,
  refreshSubmissions: async () => {},
  getPendingAssignments: () => [],
  getCompletedAssignments: () => [], 
  getStudentsByClass: async () => [],      
  getAssignmentSubmissions: async () => [],
  getClassById: async () => null,
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
        const formattedSubmissions = data.map(s => ({
          id: s.id.toString(),
          assignmentId: s.assignment_id.toString(),
          studentId: s.student_id,
          status: s.status as "not_started" | "in_progress" | "submitted",
          answers: s.answers as Array<{ questionId: number; audioUrl?: string }>,
          feedback: s.feedback ? { 
            comment: (s.feedback as { [key: string]: any }).comment ?? '',
            reviewed: (s.feedback as { [key: string]: any }).reviewed ?? false
          } : { reviewed: false },
          submittedAt: s.submitted_at
        }));
        
        setSubmissions(formattedSubmissions);
        return formattedSubmissions;
      }
      return [];
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
      return [];
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const loadTeacherSubmissions = useCallback(async (assignmentIds: string[]) => {
    if (!assignmentIds || assignmentIds.length === 0) {
      return [];
    }
    
    setSubmissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, assignment_id, student_id, status, answers, feedback, submitted_at')
        .in('assignment_id', assignmentIds.map(id => parseInt(id)));
      
      if (error) throw error;
      
      if (data) {
        const formattedSubmissions = data.map(s => ({
          id: s.id.toString(),
          assignmentId: s.assignment_id.toString(),
          studentId: s.student_id,
          status: s.status as "not_started" | "in_progress" | "submitted",
          answers: s.answers as Array<{ questionId: number; audioUrl?: string }>,
          feedback: s.feedback ? { 
            comment: (s.feedback as { [key: string]: any }).comment ?? '',
            reviewed: (s.feedback as { [key: string]: any }).reviewed ?? false
          } : { reviewed: false },
          submittedAt: s.submitted_at
        }));
        
        setSubmissions(formattedSubmissions);
        return formattedSubmissions;
      }
      return [];
    } catch (error) {
      console.error('Error loading teacher submissions:', error);
      toast.error('Failed to load submissions');
      return [];
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (classIds: string[]) => {
    if (!classIds || classIds.length === 0) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', classIds);
      
      if (error) throw error;
      
      if (data) {
        const formattedAssignments = data.map(a => ({
          id: a.id.toString(),
          classId: a.course_id,
          title: a.title,
          dueDate: a.due_date || "",
          topic: a.topic || "",
          questions: a.questions,
          createdAt: a.created_at || new Date().toISOString(),
        }));
        
        setAssignments(formattedAssignments);
        return formattedAssignments;
      }
      return [];
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
      return [];
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
      // First load classes
      const loadedClasses = await loadClasses(user.id, profile.role);
      
      if (loadedClasses.length > 0) {
        const classIds = loadedClasses.map(c => c.id);
        
        // Then load assignments independent of state
        const loadedAssignments = await loadAssignments(classIds);
        
        // Finally load submissions based on role and the assignments we just loaded
        if (profile.role === 'student') {
          await loadSubmissions(user.id);
        } else if (loadedAssignments.length > 0) {
          await loadTeacherSubmissions(loadedAssignments.map(a => a.id));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [user, profile, loadClasses, loadAssignments, loadSubmissions, loadTeacherSubmissions]);

  useEffect(() => {
    if (user && profile) {
      loadUserData();
    } else {
      setClasses([]);
      setAssignments([]);
      setSubmissions([]);
      setLoading(false);
    }
  }, [user, profile, loadUserData]);

  const refreshSubmissions = useCallback(async () => {
    if (!user?.id) return;
    
    if (profile?.role === 'teacher') {
      const assignmentIds = assignments.map(a => a.id);
      if (assignmentIds.length > 0) {
        await loadTeacherSubmissions(assignmentIds);
      }
    } else {
      await loadSubmissions(user.id);
    }
  }, [user, profile, assignments, loadSubmissions, loadTeacherSubmissions]);

  const getAssignmentStats = useCallback(async (assignmentId: string) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        // If we don't have the assignment in state, try to fetch it
        const { data } = await supabase
          .from('assignments')
          .select('course_id')
          .eq('id', parseInt(assignmentId))
          .single();
          
        if (!data) {
          return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
        }
        
        // Find the class for this assignment
        const classData = classes.find(c => c.id === data.course_id);
        if (!classData) {
          return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
        }
        
        // Get fresh submission data for this assignment
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('status')
          .eq('assignment_id', parseInt(assignmentId));
        
        const totalStudents = classData.students.length || 0;
        const submittedCount = submissionsData?.filter(s => s.status === "submitted").length || 0;
        const inProgressCount = submissionsData?.filter(s => s.status === "in_progress").length || 0;
        
        return {
          total: totalStudents,
          submitted: submittedCount,
          inProgress: inProgressCount,
          notStarted: totalStudents - (submittedCount + inProgressCount)
        };
      }
      
      const classData = classes.find(c => c.id === assignment.classId);
      const totalStudents = classData?.students.length || 0;

      // Get fresh submission data instead of relying on state
      const { data: freshSubmissions } = await supabase
        .from('submissions')
        .select('status')
        .eq('assignment_id', parseInt(assignmentId));
      
      const submittedCount = freshSubmissions?.filter(s => s.status === "submitted").length || 0;
      const inProgressCount = freshSubmissions?.filter(s => s.status === "in_progress").length || 0;
      
      return {
        total: totalStudents,
        submitted: submittedCount,
        inProgress: inProgressCount,
        notStarted: totalStudents - (submittedCount + inProgressCount)
      };
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
    }
  }, [assignments, classes]);

  const updateSubmission = useCallback(async (submission: Submission) => {
    if (!user) return;
    
    try {
      const { data: existingData } = await supabase
        .from('submissions')
        .select('id')
        .eq('assignment_id', parseInt(submission.assignmentId))
        .eq('student_id', submission.studentId)
        .maybeSingle();
      
      if (existingData) {
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
      } else {
        const { error } = await supabase
          .from('submissions')
          .insert({
            assignment_id: parseInt(submission.assignmentId),
            student_id: submission.studentId,
            status: submission.status,
            answers: submission.answers,
            submitted_at: submission.status === 'submitted' ? new Date().toISOString() : null,
            feedback: submission.feedback
          });
        
        if (error) throw error;
      }
      
      await refreshSubmissions();
      toast.success(submission.status === 'submitted' ? "Assignment submitted!" : "Progress saved");
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update submission', { description: error.message });
    }
  }, [user, refreshSubmissions]);

  const getPendingAssignments = useCallback((studentId: string): Assignment[] => {
    return assignments.filter(assignment => {
      const submission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === studentId);
      return !submission || submission.status !== "submitted";
    });
  }, [assignments, submissions]);

  const getCompletedAssignments = useCallback((studentId: string): Assignment[] => {
    return assignments.filter(assignment => {
      const submission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === studentId);
      return submission?.status === "submitted";
    });
  }, [assignments, submissions]);

  const getStudentsByClass = useCallback(async (classId: string) => {
    try {
      const { data: enrollments, error } = await supabase
        .from('students_classes')
        .select('student_id')
        .eq('class_id', classId);
      
      if (error) throw error;
      if (!enrollments || enrollments.length === 0) return [];
  
      const studentIds = enrollments.map(e => e.student_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', studentIds);
      
      if (usersError) throw usersError;
      
      return usersData?.map(user => ({
        id: user.id,
        name: user.name || 'Unknown'
      })) || [];
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
      return [];
    }
  }, []);

  const getAssignmentSubmissions = useCallback(async (assignmentId: string) => {
    try {
      const assignmentIdInt = parseInt(assignmentId, 10);
      if (isNaN(assignmentIdInt)) throw new Error('Invalid assignment ID');
      
      // Always get fresh data from the database
      const { data: submissionsData, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentIdInt);
      
      if (error) throw error;
      if (!submissionsData) return [];
      
      const studentIds = submissionsData.map(s => s.student_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', studentIds);
      
      if (usersError) throw usersError;
      
      const studentNameMap = new Map();
      usersData?.forEach(user => {
        studentNameMap.set(user.id, user.name || 'Unknown');
      });
      
      const freshSubmissions = submissionsData.map(item => ({
        id: item.id.toString(),
        assignmentId,
        studentId: item.student_id,
        studentName: studentNameMap.get(item.student_id) || 'Unknown',
        status: item.status as "not_started" | "in_progress" | "submitted",
        answers: item.answers as Array<{ questionId: number; audioUrl?: string }>,
        feedback: item.feedback as { comment?: string; reviewed?: boolean } | undefined,
        submittedAt: item.submitted_at
      }));
      
      // Update state with fresh data
      setSubmissions(prev => {
        const updated = prev.filter(s => s.assignmentId !== assignmentId);
        return [...updated, ...freshSubmissions];
      });
      
      return freshSubmissions;
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
      return [];
    }
  }, []);

  const getClassById = useCallback(async (classId: string) => {
    try {
      // Always get fresh data from Supabase
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) throw error;

      if (data) {
        const { data: studentsData } = await supabase
          .from('students_classes')
          .select('student_id')
          .eq('class_id', data.id);

        const transformedClass: Class = {
          id: data.id,
          name: data.name,
          code: data.class_code,
          teacherId: data.teacher_id,
          students: studentsData?.map(s => s.student_id) || [],
        };

        // Update the local state with the fetched class
        setClasses(prev => {
          const existingIndex = prev.findIndex(c => c.id === transformedClass.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = transformedClass;
            return updated;
          }
          return [...prev, transformedClass];
        });

        return transformedClass;
      }

      return null; // Class not found
    } catch (error) {
      console.error('Error fetching class by ID:', error);
      toast.error('Failed to load class details');
      return null;
    }
  }, []);

  const updateSubmissionFeedback = useCallback(async (submissionId: string, comment: string, reviewed: boolean) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          feedback: { comment, reviewed }
        })
        .eq('id', submissionId);
        
      if (error) throw error;
      
      setSubmissions(prev => 
        prev.map(s => s.id === submissionId ? { 
          ...s, 
          feedback: { comment, reviewed } 
        } : s)
      );
      toast.success("Feedback saved successfully");
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to save feedback');
    }
  }, []);

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
            
            const { data: existing } = await supabase
              .from('students_classes')
              .select('*')
              .eq('class_id', classData.id)
              .eq('student_id', user.id);
            
            if (existing && existing.length > 0) {
              toast.info("Already joined this class");
              return true;
            }
            
            const { error: joinError } = await supabase
              .from('students_classes')
              .insert({ class_id: classData.id, student_id: user.id });
            
            if (joinError) throw joinError;
            
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
        getAssignmentsByClass: (classId: string) => assignments.filter(a => a.classId === classId),
        getSubmissionsByAssignment: (assignmentId: string) => submissions.filter(s => s.assignmentId === assignmentId),
        getAssignmentStats,
        updateSubmission,
        updateSubmissionFeedback,
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
        getStudentsByClass,
        getAssignmentSubmissions,
        getClassById,
      }}
    >
      {children}
    </ClassContext.Provider>
  )};