
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
