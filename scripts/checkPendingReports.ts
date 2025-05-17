import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PendingReport {
  submissionId: number;
  submissionUid: string;
  studentName: string;
  studentAnswers: any;
  assignmentTitle: string;
  submittedAt: string;
  grade: number | null;
}

interface TeacherReports {
  teacherId: string;
  teacherName: string;
  pendingReports: PendingReport[];
}

interface Report {
  generatedAt: string;
  totalPendingReports: number;
  teachers: TeacherReports[];
}

async function checkPendingReports(checkZeroScores: boolean = false) {
  try {
    console.log(`Checking for ${checkZeroScores ? 'zero score' : 'pending'} reports...\n`);

    // 1. Get all submissions based on the check type
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, submission_uid, status, grade, submitted_at, student_id, assignment_id, answers')
      .eq('status', 'submitted')
      .eq('grade', checkZeroScores ? 0 : null);

    if (submissionsError) throw submissionsError;
    if (!submissions || submissions.length === 0) {
      console.log(`No ${checkZeroScores ? 'zero score' : 'pending'} reports found.`);
      return;
    }

    // 2. Get all needed assignments, classes, users in one go
    const assignmentIds = Array.from(new Set(submissions.map(s => s.assignment_id))).filter(Boolean);
    const studentIds = Array.from(new Set(submissions.map(s => s.student_id))).filter(Boolean);

    // Get assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, title, course_id')
      .in('id', assignmentIds);
    if (assignmentsError) throw assignmentsError;

    // Get classes
    const classIds = Array.from(new Set(assignments.map(a => a.course_id))).filter(Boolean);
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .in('id', classIds);
    if (classesError) throw classesError;

    // Get all teacher ids
    const teacherIds = Array.from(new Set(classes.map(c => c.teacher_id))).filter(Boolean);
    const userIds = Array.from(new Set([...studentIds, ...teacherIds])).filter(Boolean);

    // Get users (students and teachers)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
    if (usersError) throw usersError;

    // Build lookup maps
    const assignmentMap = new Map(assignments.map(a => [a.id, a]));
    const classMap = new Map(classes.map(c => [c.id, c]));
    const userMap = new Map(users.map(u => [u.id, u]));

    // Group pending reports by teacher
    const pendingReportsByTeacher = new Map<string, TeacherReports>();

    for (const submission of submissions) {
      const assignment = assignmentMap.get(submission.assignment_id);
      if (!assignment) continue;
      const classObj = classMap.get(assignment.course_id);
      if (!classObj) continue;
      const teacher = userMap.get(classObj.teacher_id);
      if (!teacher) continue;
      const student = userMap.get(submission.student_id);
      if (!student) continue;

      if (!pendingReportsByTeacher.has(teacher.id)) {
        pendingReportsByTeacher.set(teacher.id, {
          teacherId: teacher.id,
          teacherName: teacher.name,
          pendingReports: []
        });
      }

      pendingReportsByTeacher.get(teacher.id)!.pendingReports.push({
        submissionId: submission.id,
        submissionUid: submission.submission_uid,
        studentName: student.name,
        studentAnswers: submission.answers,
        assignmentTitle: assignment.title,
        submittedAt: submission.submitted_at,
        grade: submission.grade
      });
    }

    // Generate report
    const report: Report = {
      generatedAt: new Date().toISOString(),
      totalPendingReports: submissions.length,
      teachers: Array.from(pendingReportsByTeacher.values())
    };

    // Save to file with appropriate name
    const reportJson = JSON.stringify(report, null, 2);
    const fileName = checkZeroScores ? 'zero-score-reports.json' : 'pending-reports.json';
    fs.writeFileSync(fileName, reportJson);
    console.log(`Report saved to ${fileName}`);
  } catch (error) {
    console.error('Error checking reports:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const checkZeroScores = args.includes('--0');

// Run the check
checkPendingReports(checkZeroScores); 