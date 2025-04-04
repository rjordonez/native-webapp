
export type UserRole = "teacher" | "student";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  students: string[];
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  dueDate: string;
  topic: string;
  questions: string[];
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: "not_started" | "in_progress" | "submitted";
  answers: {
    questionId: number;
    audioUrl?: string;
  }[];
  submittedAt?: string;
}
