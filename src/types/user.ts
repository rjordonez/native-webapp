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
  metadata?: any;
}

interface StudentClass {
  student_id: string;
  class_id: string;
  overall_grade?: number; // Make it optional with ?
}

export interface Submission {
  id: string;               // This could be your auto-incremented ID (or the primary key)
  submission_uid: string;   // Your custom unique identifier (e.g. "temp_abc123")
  assignmentId: string;
  studentId: string;
  status: "not_started" | "in_progress" | "submitted";
  answers: {
    questionId: number;
    audioUrl?: string;
  }[];
  submittedAt?: string;
  feedback?: {
    comment?: string;
    reviewed: boolean;
    grade?: number;
  };
  attempt?: number;
}

// Mock students to use for submissions display
export const mockStudents: User[] = [
  { id: "student1", email: "amy@example.com", role: "student", name: "Amy Johnson" },
  { id: "student2", email: "bryan@example.com", role: "student", name: "Bryan Smith" },
  { id: "student3", email: "clara@example.com", role: "student", name: "Clara Wilson" },
  { id: "student4", email: "daniel@example.com", role: "student", name: "Daniel Brown" },
  { id: "student5", email: "elena@example.com", role: "student", name: "Elena Garcia" },
  { id: "student6", email: "frank@example.com", role: "student", name: "Frank Davis" },
  { id: "student7", email: "grace@example.com", role: "student", name: "Grace Taylor" },
  { id: "student8", email: "henry@example.com", role: "student", name: "Henry Clark" }
];

// Mock assignments topics
export const mockTopics = [
  "Hometown",
  "Family",
  "Work",
  "Education",
  "Hobbies",
  "Travel",
  "Food",
  "Technology",
  "Environment",
  "Culture"
];

// Mock assignment questions
export const mockQuestions = {
  "Hometown": [
    "Tell me about the place where you grew up.",
    "What do you like most about your hometown?",
    "How has your hometown changed in recent years?",
    "Would you recommend your hometown as a place to visit? Why or why not?"
  ],
  "Family": [
    "Can you describe your family structure?",
    "What activities do you enjoy doing with your family?",
    "How important is family in your culture?",
    "What family traditions do you maintain?"
  ],
  "Work": [
    "What do you do for work?",
    "How did you choose your career path?",
    "What do you enjoy most about your job?",
    "How do you maintain work-life balance?"
  ],
  "Education": [
    "Describe your educational background.",
    "What was your favorite subject in school and why?",
    "How has education impacted your life?",
    "What would you change about the education system in your country?"
  ]
};
