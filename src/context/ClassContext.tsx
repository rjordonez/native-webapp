import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
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
    questions: string[],
    metadata?: string  // Add this optional parameter
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
  updateSubmissionFeedback: (
    submissionId: string,
    comment: string,
    reviewed: boolean
  ) => Promise<void>;
  uploadAudio: (
    assignmentId: string,
    questionId: number,
    audioBlob: Blob
  ) => Promise<string | null>;
  refreshSubmissions: () => Promise<void>;
  getPendingAssignments: (studentId: string) => Assignment[];
  getCompletedAssignments: (studentId: string) => Assignment[];
  getStudentsByClass: (
    classId: string
  ) => Promise<{ id: string; name: string }[]>;
  getAssignmentSubmissions: (
    assignmentId: string
  ) => Promise<Submission[]>;
  getClassById: (classId: string) => Promise<Class | null>;
  deleteAssignment: (assignmentId: string) => Promise<boolean>;
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
  getAssignmentStats: async () => ({
    total: 0,
    submitted: 0,
    inProgress: 0,
    notStarted: 0,
  }),
  updateSubmission: async () => {},
  updateSubmissionFeedback: async () => {},
  uploadAudio: async () => null,
  refreshSubmissions: async () => {},
  getPendingAssignments: () => [],
  getCompletedAssignments: () => [],
  getStudentsByClass: async () => [],
  getAssignmentSubmissions: async () => [],
  getClassById: async () => null,
  deleteAssignment: async () => false,
  
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);
  const { user, profile } = useAuth();
  const [studentsLoading, setStudentsLoading] = useState({});
  // -----------------------------------------------------
  // Load Submissions (Student)
  // -----------------------------------------------------
  const loadSubmissions = useCallback(async (userId: string) => {
    setSubmissionsLoading(true);
    try {
      // Here we select submission_uid. The DB must have that column.
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, submission_uid, assignment_id, student_id, status, answers, feedback, submitted_at"
        )
        .eq("student_id", userId);

      if (error) {
        // If the error says "column 'submission_uid' does not exist",
        // that means the DB truly doesn't have it in that environment.
        throw error;
      }

      if (data && Array.isArray(data)) {
        const formattedSubmissions: Submission[] = data.map((s: any) => ({
          id: s.id.toString(),
          submission_uid: s.submission_uid ?? "",
          assignmentId: s.assignment_id.toString(),
          studentId: s.student_id,
          status: s.status as "not_started" | "in_progress" | "submitted",
          answers: s.answers as Array<{ questionId: number; audioUrl?: string }>,
          feedback: s.feedback
            ? {
                comment: (s.feedback as { [key: string]: any }).comment ?? "",
                reviewed: (s.feedback as { [key: string]: any }).reviewed ?? false,
              }
            : { reviewed: false },
          submittedAt: s.submitted_at,
        }));
        setSubmissions(formattedSubmissions);
        return formattedSubmissions;
      }
      return [];
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
      return [];
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  // -----------------------------------------------------
  // Load Submissions (Teacher)
  // -----------------------------------------------------
  const loadTeacherSubmissions = useCallback(async (assignmentIds: string[]) => {
    if (!assignmentIds || assignmentIds.length === 0) {
      return [];
    }
    setSubmissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, submission_uid, assignment_id, student_id, status, answers, feedback, submitted_at"
        )
        .in(
          "assignment_id",
          assignmentIds.map((id) => parseInt(id, 10))
        );

      if (error) throw error;

      if (data && Array.isArray(data)) {
        const formattedSubmissions: Submission[] = data.map((s: any) => ({
          id: s.id.toString(),
          submission_uid: s.submission_uid ?? "",
          assignmentId: s.assignment_id.toString(),
          studentId: s.student_id,
          status: s.status as "not_started" | "in_progress" | "submitted",
          answers: s.answers as Array<{ questionId: number; audioUrl?: string }>,
          feedback: s.feedback
            ? {
                comment: (s.feedback as { [key: string]: any }).comment ?? "",
                reviewed: (s.feedback as { [key: string]: any }).reviewed ?? false,
              }
            : { reviewed: false },
          submittedAt: s.submitted_at,
        }));
        setSubmissions(formattedSubmissions);
        return formattedSubmissions;
      }
      return [];
    } catch (error) {
      console.error("Error loading teacher submissions:", error);
      toast.error("Failed to load submissions");
      return [];
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  // -----------------------------------------------------
  // Load Assignments
  // -----------------------------------------------------
  const loadAssignments = useCallback(async (classIds: string[]) => {
    if (!classIds || classIds.length === 0) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .in("course_id", classIds);

      if (error) throw error;
      if (data) {
        const formatted: Assignment[] = data.map((a: any) => ({
          id: a.id.toString(),
          classId: a.course_id,
          title: a.title,
          dueDate: a.due_date || "",
          topic: a.topic || "",
          questions: a.questions,
          createdAt: a.created_at || new Date().toISOString(),
          metadata: a.metadata || null,  // Add this field
        }));
        setAssignments(formatted);
        return formatted;
      }
      return [];
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments");
      return [];
    }
  }, []);

  // -----------------------------------------------------
  // Load Classes
  // -----------------------------------------------------
  const loadClasses = useCallback(async (userId: string, role: string) => {
    try {
      if (role === "teacher") {
        const { data, error } = await supabase
          .from("classes")
          .select("*")
          .eq("teacher_id", userId);
        if (error) throw error;

        if (data) {
          const transformed = await Promise.all(
            data.map(async (c: any) => {
              const { data: studentsData } = await supabase
                .from("students_classes")
                .select("student_id")
                .eq("class_id", c.id);

              return {
                id: c.id,
                name: c.name,
                code: c.class_code,
                teacherId: c.teacher_id,
                students: studentsData?.map((s) => s.student_id) || [],
              };
            })
          );
          setClasses(transformed);
          return transformed;
        }
      } else {
        // Student role
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("students_classes")
          .select("class_id")
          .eq("student_id", userId);
        if (enrollmentsError) throw enrollmentsError;

        if (enrollments) {
          const classIds = enrollments.map((e) => e.class_id);
          const { data: studentClasses, error: studentClassesErr } = await supabase
            .from("classes")
            .select("*")
            .in("id", classIds);

          if (studentClassesErr) throw studentClassesErr;

          if (studentClasses) {
            const transformed = studentClasses.map((c: any) => ({
              id: c.id,
              name: c.name,
              code: c.class_code,
              teacherId: c.teacher_id,
              students: [userId],
            }));
            setClasses(transformed);
            return transformed;
          }
        }
      }
      return [];
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
      return [];
    }
  }, []);

  // -----------------------------------------------------
  // loadUserData (Master)
  // -----------------------------------------------------
  const loadUserData = useCallback(async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      // 1) Load classes
      const loadedClasses = await loadClasses(user.id, profile.role);

      // 2) If we have classes, load assignments
      if (loadedClasses.length > 0) {
        const classIds = loadedClasses.map((c) => c.id);
        const loadedAssignments = await loadAssignments(classIds);

        // 3) Submissions: depends on role
        if (profile.role === "student") {
          await loadSubmissions(user.id);
        } else if (loadedAssignments.length > 0) {
          await loadTeacherSubmissions(loadedAssignments.map((a) => a.id));
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    profile,
    loadClasses,
    loadAssignments,
    loadSubmissions,
    loadTeacherSubmissions,
  ]);

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

  // -----------------------------------------------------
  // Refresh Submissions
  // -----------------------------------------------------
  const refreshSubmissions = useCallback(async () => {
    if (!user?.id) return;
    if (profile?.role === "teacher") {
      const assignmentIds = assignments.map((a) => a.id);
      if (assignmentIds.length > 0) {
        await loadTeacherSubmissions(assignmentIds);
      }
    } else {
      await loadSubmissions(user.id);
    }
  }, [user, profile, assignments, loadSubmissions, loadTeacherSubmissions]);

  // -----------------------------------------------------
  // getAssignmentStats
  // -----------------------------------------------------
  const getAssignmentStats = useCallback(
    async (assignmentId: string) => {
      try {
        const assignment = assignments.find((a) => a.id === assignmentId);
        if (!assignment) {
          // fetch from DB
          const { data } = await supabase
            .from("assignments")
            .select("course_id")
            .eq("id", parseInt(assignmentId, 10))
            .single();
          if (!data) {
            return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
          }
          const classData = classes.find((c) => c.id === data.course_id);
          if (!classData) {
            return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
          }
          const { data: subsData } = await supabase
            .from("submissions")
            .select("status")
            .eq("assignment_id", parseInt(assignmentId, 10));

          const totalStudents = classData.students.length || 0;
          const submittedCount =
            subsData?.filter((s) => s.status === "submitted").length || 0;
          const inProgressCount =
            subsData?.filter((s) => s.status === "in_progress").length || 0;

          return {
            total: totalStudents,
            submitted: submittedCount,
            inProgress: inProgressCount,
            notStarted: totalStudents - (submittedCount + inProgressCount),
          };
        }

        // If we have assignment in state
        const classData = classes.find((c) => c.id === assignment.classId);
        const totalStudents = classData?.students.length || 0;

        const { data: freshSubs } = await supabase
          .from("submissions")
          .select("status")
          .eq("assignment_id", parseInt(assignmentId, 10));

        const submittedCount =
          freshSubs?.filter((s) => s.status === "submitted").length || 0;
        const inProgressCount =
          freshSubs?.filter((s) => s.status === "in_progress").length || 0;

        return {
          total: totalStudents,
          submitted: submittedCount,
          inProgress: inProgressCount,
          notStarted: totalStudents - (submittedCount + inProgressCount),
        };
      } catch (error) {
        console.error("Error getting assignment stats:", error);
        return { total: 0, submitted: 0, inProgress: 0, notStarted: 0 };
      }
    },
    [assignments, classes]
  );

  // -----------------------------------------------------
  // updateSubmission
  // -----------------------------------------------------
  const updateSubmission = useCallback(
    async (submission: Submission) => {
      if (!user) return;
  
      try {
        // Check if a submission already exists for this assignment and student
        const { data: existingData } = await supabase
          .from("submissions")
          .select("id")
          .eq("assignment_id", parseInt(submission.assignmentId, 10))
          .eq("student_id", submission.studentId)
          .maybeSingle();
  
        if (existingData) {
          // Update existing submission
          const { error } = await supabase
            .from("submissions")
            .update({
              submission_uid: submission.submission_uid,
              status: submission.status,
              answers: submission.answers,
              submitted_at:
                submission.status === "submitted"
                  ? new Date().toISOString()
                  : null,
              feedback: submission.feedback,
            })
            .eq("id", existingData.id);
  
          if (error) throw error;
        } else {
          // Insert new submission
          const { error } = await supabase
            .from("submissions")
            .insert({
              submission_uid: submission.submission_uid,
              assignment_id: parseInt(submission.assignmentId, 10),
              student_id: submission.studentId,
              status: submission.status,
              answers: submission.answers,
              submitted_at:
                submission.status === "submitted"
                  ? new Date().toISOString()
                  : null,
              feedback: submission.feedback,
            });
  
          if (error) throw error;
        }
  
        // Refresh local state and show a toast
        await refreshSubmissions();
        toast.success(
          submission.status === "submitted"
            ? "Assignment submitted!"
            : "Progress saved"
        );
      } catch (error: any) {
        console.error("Error updating submission:", error);
        toast.error("Failed to update submission", {
          description: error.message,
        });
      }
    },
    [user, refreshSubmissions]
  );
  
  // -----------------------------------------------------
  // Pending & Completed
  // -----------------------------------------------------
  const getPendingAssignments = useCallback(
    (studentId: string): Assignment[] => {
      return assignments.filter((assignment) => {
        const submission = submissions.find(
          (s) => s.assignmentId === assignment.id && s.studentId === studentId
        );
        return !submission || submission.status !== "submitted";
      });
    },
    [assignments, submissions]
  );

  const getCompletedAssignments = useCallback(
    (studentId: string): Assignment[] => {
      return assignments.filter((assignment) => {
        const submission = submissions.find(
          (s) => s.assignmentId === assignment.id && s.studentId === studentId
        );
        return submission?.status === "submitted";
      });
    },
    [assignments, submissions]
  );

  // -----------------------------------------------------
  // getStudentsByClass
  // -----------------------------------------------------
  const getStudentsByClass = useCallback(async (classId: string) => {
    // Set loading state for this specific class
    setStudentsLoading(prev => ({ ...prev, [classId]: true }));
    
    try {
      // Get both requests started in parallel instead of sequentially
      const enrollmentsPromise = supabase
        .from("students_classes")
        .select("student_id")
        .eq("class_id", classId);
        
      // Wait for the first query to complete
      const { data: enrollments, error } = await enrollmentsPromise;
      if (error) throw error;
      if (!enrollments || enrollments.length === 0) {
        setStudentsLoading(prev => ({ ...prev, [classId]: false }));
        return [];
      }
  
      // Make the second query
      const studentIds = enrollments.map((e) => e.student_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", studentIds);
      
      if (usersError) throw usersError;
  
      // Only return when we have complete data
      const result = usersData?.map((user) => ({
        id: user.id,
        name: user.name || "Unknown",
      })) || [];
      
      return result;
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
      return [];
    } finally {
      // Always clear loading state
      setStudentsLoading(prev => ({ ...prev, [classId]: false }));
    }
  }, []);

  // -----------------------------------------------------
  // getAssignmentSubmissions
  // -----------------------------------------------------
  const getAssignmentSubmissions = useCallback(async (assignmentId: string) => {
    try {
      const assignmentIdInt = parseInt(assignmentId, 10);
      if (isNaN(assignmentIdInt)) {
        throw new Error("Invalid assignment ID");
      }
      const { data: subsData, error } = await supabase
        .from("submissions")
        .select(
          "id, submission_uid, assignment_id, student_id, status, answers, feedback, submitted_at"
        )
        .eq("assignment_id", parseInt(assignmentId, 10))

      if (error) throw error;
      if (!subsData) return [];

      // Optional: fetch user names
      const studentIds = subsData.map((s) => s.student_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", studentIds);
      if (usersError) throw usersError;

      const nameMap = new Map();
      usersData?.forEach((u) => {
        nameMap.set(u.id, u.name || "Unknown");
      });

      // Build them as Submission objects
      const freshSubmissions: Submission[] = subsData.map((item: any) => ({
        id: item.id.toString(),
        submission_uid: item.submission_uid ?? "",
        assignmentId,
        studentId: item.student_id,
        status: item.status as "not_started" | "in_progress" | "submitted",
        answers: item.answers as Array<{ questionId: number; audioUrl?: string }>,
        feedback: item.feedback
          ? {
              comment: (item.feedback as { [key: string]: any }).comment ?? "",
              reviewed:
                (item.feedback as { [key: string]: any }).reviewed ?? false,
            }
          : { reviewed: false },
        submittedAt: item.submitted_at,
        // Not in Submission interface by default, but you could store a local "studentName" if you want
        // studentName: nameMap.get(item.student_id),
      }));

      // Merge them into local state
      setSubmissions((prev) => {
        // remove old submissions for this assignment
        const updated = prev.filter((s) => s.assignmentId !== assignmentId);
        return [...updated, ...freshSubmissions];
      });

      return freshSubmissions;
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
      return [];
    }
  }, []);

  // -----------------------------------------------------
  // getClassById
  // -----------------------------------------------------
  const getClassById = useCallback(async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();
      if (error) throw error;

      if (data) {
        const { data: studentsData } = await supabase
          .from("students_classes")
          .select("student_id")
          .eq("class_id", data.id);

        const transformedClass: Class = {
          id: data.id,
          name: data.name,
          code: data.class_code,
          teacherId: data.teacher_id,
          students: studentsData?.map((s) => s.student_id) || [],
        };

        // Merge in local state
        setClasses((prev) => {
          const existingIndex = prev.findIndex((c) => c.id === transformedClass.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = transformedClass;
            return updated;
          }
          return [...prev, transformedClass];
        });

        return transformedClass;
      }
      return null;
    } catch (error) {
      console.error("Error fetching class by ID:", error);
      toast.error("Failed to load class details");
      return null;
    }
  }, []);

  // -----------------------------------------------------
  // updateSubmissionFeedback
  // -----------------------------------------------------
  const updateSubmissionFeedback = useCallback(
    async (submissionId: string, comment: string, reviewed: boolean) => {
      try {
        const { error } = await supabase
          .from("submissions")
          .update({
            feedback: { comment, reviewed },
          })
          .eq("id", submissionId);
        if (error) throw error;

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  feedback: { comment, reviewed },
                }
              : s
          )
        );
        toast.success("Feedback saved successfully");
      } catch (error) {
        console.error("Error updating feedback:", error);
        toast.error("Failed to save feedback");
      }
    },
    []
  );

  // -----------------------------------------------------
  // createClass
  // -----------------------------------------------------
  const createClass = async (name: string) => {
    if (!user) return;
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const { data, error } = await supabase
        .from("classes")
        .insert({ name, class_code: code, teacher_id: user.id })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setClasses((prev) => [
          ...prev,
          {
            id: data.id,
            name: data.name,
            code: data.class_code,
            teacherId: data.teacher_id,
            students: [],
          },
        ]);
        toast.success(`Class created with code: ${code}`);
      }
    } catch (error: any) {
      console.error("Error creating class:", error);
      toast.error("Error creating class", { description: error.message });
    }
  };

  // -----------------------------------------------------
  // joinClass
  // -----------------------------------------------------
  const joinClass = async (code: string) => {
    if (!user) return false;
    try {
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("class_code", code)
        .single();
      if (classError) throw classError;

      const { data: existing } = await supabase
        .from("students_classes")
        .select("*")
        .eq("class_id", classData.id)
        .eq("student_id", user.id);

      if (existing && existing.length > 0) {
        toast.info("Already joined this class");
        return true;
      }
      const { error: joinError } = await supabase
        .from("students_classes")
        .insert({ class_id: classData.id, student_id: user.id });
      if (joinError) throw joinError;

      setClasses((prev) => {
        const existingClass = prev.find((c) => c.id === classData.id);
        if (existingClass) {
          return prev.map((c) =>
            c.id === classData.id
              ? { ...c, students: [...c.students, user.id] }
              : c
          );
        }
        return [
          ...prev,
          {
            id: classData.id,
            name: classData.name,
            code: classData.class_code,
            teacherId: classData.teacher_id,
            students: [user.id],
          },
        ];
      });

      toast.success("Class joined successfully!");
      return true;
    } catch (error: any) {
      console.error("Error joining class:", error);
      toast.error("Error joining class", { description: error.message });
      return false;
    }
  };

  // -----------------------------------------------------
  // createAssignment
  // -----------------------------------------------------
  const createAssignment = async (
    classId: string,
    title: string,
    dueDate: string,
    topic: string,
    questions: string[],
    metadata?: string  // Add this optional parameter
  ) => {
    if (!user || profile?.role !== "teacher") return;
    try {
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          course_id: classId,
          title,
          questions,
          due_date: dueDate,
          topic,
          created_by: user.id,
          metadata: metadata || null,  // Add this field
        })
        .select()
        .single();
      if (error) throw error;
  
      if (data) {
        setAssignments((prev) => [
          ...prev,
          {
            id: data.id.toString(),
            classId: data.course_id,
            title: data.title,
            dueDate: data.due_date || dueDate,
            topic: data.topic || topic,
            questions: data.questions,
            createdAt: data.created_at || new Date().toISOString(),
            metadata: data.metadata || null,  // Add this field
          },
        ]);
        toast.success("Assignment created successfully");
      }
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment", {
        description: error.message,
      });
    }
  };

  // -----------------------------------------------------
  // uploadAudio
  // -----------------------------------------------------
  const uploadAudio = async (
    assignmentId: string,
    questionId: number,
    audioBlob: Blob
  ): Promise<string | null> => {
    if (!user) return null;
    try {
      const filePath = `${user.id}/${assignmentId}/${questionId}_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from("audio_recordings")
        .upload(filePath, audioBlob, {
          cacheControl: "3600",
          upsert: true,
        });
      if (error) throw error;

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from("audio_recordings")
          .getPublicUrl(data.path);
        return publicUrlData.publicUrl;
      }
      return null;
    } catch (error: any) {
      console.error("Error uploading audio:", error);
      toast.error("Error uploading audio", { description: error.message });
      return null;
    }
  };


  // -----------------------------------------------------
  // deleteAssignment
  // -----------------------------------------------------
  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    if (!user || profile?.role !== "teacher") {
      toast.error("Only teachers can delete assignments");
      return false;
    }

    try {
      // First, check if there are any submissions to warn the user if needed
      const { data: subsCount, error: subsError } = await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", parseInt(assignmentId, 10));
        
      if (subsError) throw subsError;
      
      // Delete all related submissions first (foreign key constraint)
      const { error: delSubsError } = await supabase
        .from("submissions")
        .delete()
        .eq("assignment_id", parseInt(assignmentId, 10));
        
      if (delSubsError) throw delSubsError;
      
      // Delete the assignment itself
      const { error: delAssignError } = await supabase
        .from("assignments")
        .delete()
        .eq("id", parseInt(assignmentId, 10));
        
      if (delAssignError) throw delAssignError;
      
      // Update local state
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      
      // Remove related submissions from state too
      setSubmissions((prev) => 
        prev.filter((s) => s.assignmentId !== assignmentId)
      );
      
      toast.success("Assignment deleted successfully");
      return true;
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment", {
        description: error.message,
      });
      return false;
    }
  };

  // -----------------------------------------------------
  // Final Return
  // -----------------------------------------------------
  return (
    <ClassContext.Provider
      value={{
        classes,
        assignments,
        submissions,
        loading,
        submissionsLoading,
        createClass,
        joinClass,
        getClassesByUser: () => classes,
        createAssignment,
        getAssignmentsByClass: (classId: string) =>
          assignments.filter((a) => a.classId === classId),
        getSubmissionsByAssignment: (assignmentId: string) =>
          submissions.filter((s) => s.assignmentId === assignmentId),
        getAssignmentStats,
        updateSubmission,
        updateSubmissionFeedback,
        uploadAudio,
        refreshSubmissions,
        getPendingAssignments,
        getCompletedAssignments,
        getStudentsByClass,
        getAssignmentSubmissions,
        getClassById,
        deleteAssignment,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
};