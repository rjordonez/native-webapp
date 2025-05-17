import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MissingAnalysisReport {
  submissionId: number;
  submissionUid: string;
  studentName: string;
  assignmentTitle: string;
  submittedAt: string;
  questionNumber: number;
  transcript: string;
  missingSections: string[];
}

interface TeacherReports {
  teacherId: string;
  teacherName: string;
  reports: MissingAnalysisReport[];
}

interface Report {
  generatedAt: string;
  totalReports: number;
  teachers: TeacherReports[];
}

// Helper function to check both formats
function checkKeyExists(obj: any, key: string, index: number): boolean {
  // Check old format (starts with)
  const oldFormatKey = `recording_${index + 1}`;
  if (obj?.[oldFormatKey]) return true;

  // Check new format (contains)
  const newFormatKey = Object.keys(obj || {}).find(k => 
    k.includes(`recording_${index + 1}_`) && 
    !k.includes(`recording_${index + 1}_`, k.indexOf(`recording_${index + 1}_`) + 1)
  );
  return !!newFormatKey;
}

// Helper function to process a batch of submissions
async function processSubmissionBatch(
  submissions: any[],
  assignmentMap: Map<string, any>,
  classMap: Map<string, any>,
  userMap: Map<string, any>,
  reportsByTeacher: Map<string, TeacherReports>
) {
  // Download all analysis files in parallel
  const downloadPromises = submissions.map(async (submission) => {
    try {
      const { data, error } = await supabase.storage
        .from("analysis-results")
        .download(`${submission.submission_uid}.json`);

      if (error) {
        console.error(`Error fetching analysis for submission ${submission.id}:`, error);
        return null;
      }

      const fileText = await data.text();
      return {
        submission,
        analysis: JSON.parse(fileText)
      };
    } catch (e) {
      console.error(`Error processing submission ${submission.id}:`, e);
      return null;
    }
  });

  const results = await Promise.all(downloadPromises);

  // Process the results
  for (const result of results) {
    if (!result) continue;

    const { submission, analysis } = result;
    const assignment = assignmentMap.get(submission.assignment_id);
    if (!assignment) continue;

    const classObj = classMap.get(assignment.course_id);
    if (!classObj) continue;

    const teacher = userMap.get(classObj.teacher_id);
    if (!teacher) continue;

    if (analysis.pronunciation_analysis && Array.isArray(analysis.pronunciation_analysis)) {
      analysis.pronunciation_analysis.forEach((questionAnalysis: any, index: number) => {
        if (!questionAnalysis.transcript) return;

        const missingSections: string[] = [];

        if (!checkKeyExists(analysis.fluency_coherence_analysis, 'fluency', index)) {
          missingSections.push('Fluency & Coherence');
        }

        if (!checkKeyExists(analysis.grammar_analysis, 'grammar', index)) {
          missingSections.push('Grammar');
        }

        if (!checkKeyExists(analysis.vocabulary_suggestions, 'vocabulary', index)) {
          missingSections.push('Vocabulary');
        }

        if (missingSections.length > 0) {
          const student = userMap.get(submission.student_id);
          if (!student) return;

          if (!reportsByTeacher.has(teacher.id)) {
            reportsByTeacher.set(teacher.id, {
              teacherId: teacher.id,
              teacherName: teacher.name,
              reports: []
            });
          }

          reportsByTeacher.get(teacher.id)!.reports.push({
            submissionId: submission.id,
            submissionUid: submission.submission_uid,
            studentName: student.name,
            assignmentTitle: assignment.title,
            submittedAt: submission.submitted_at,
            questionNumber: index + 1,
            transcript: questionAnalysis.transcript,
            missingSections
          });
        }
      });
    }
  }
}

async function checkMissingAnalysis(teacherId?: string) {
  try {
    console.log('Checking for reports with missing analysis sections...\n');

    // 1. Get all submissions that have been analyzed
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, submission_uid, status, submitted_at, student_id, assignment_id, answers')
      .eq('status', 'submitted');

    if (submissionsError) throw submissionsError;
    if (!submissions || submissions.length === 0) {
      console.log('No submissions found.');
      return;
    }

    console.log(`Found ${submissions.length} total submissions.`);

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

    // Filter submissions by teacher if teacherId is provided
    const filteredSubmissions = teacherId 
      ? submissions.filter(submission => {
          const assignment = assignmentMap.get(submission.assignment_id);
          if (!assignment) return false;
          const classObj = classMap.get(assignment.course_id);
          if (!classObj) return false;
          return classObj.teacher_id === teacherId;
        })
      : submissions;

    console.log(`Processing ${filteredSubmissions.length} submissions for teacher ${teacherId || 'all teachers'}...`);

    // Group reports by teacher
    const reportsByTeacher = new Map<string, TeacherReports>();

    // Process submissions in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < filteredSubmissions.length; i += BATCH_SIZE) {
      const batch = filteredSubmissions.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(filteredSubmissions.length / BATCH_SIZE)}...`);
      await processSubmissionBatch(batch, assignmentMap, classMap, userMap, reportsByTeacher);
    }

    // Generate report
    const report: Report = {
      generatedAt: new Date().toISOString(),
      totalReports: Array.from(reportsByTeacher.values()).reduce(
        (sum, teacher) => sum + teacher.reports.length, 
        0
      ),
      teachers: Array.from(reportsByTeacher.values())
    };

    // Save to file
    const reportJson = JSON.stringify(report, null, 2);
    fs.writeFileSync('missing-analysis-reports.json', reportJson);
    console.log('\nReport saved to missing-analysis-reports.json');
  } catch (error) {
    console.error('Error checking reports:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const teacherId = args[0];

if (!teacherId) {
  console.error('Please provide a teacher ID');
  process.exit(1);
}

// Run the check for the specified teacher
checkMissingAnalysis(teacherId); 