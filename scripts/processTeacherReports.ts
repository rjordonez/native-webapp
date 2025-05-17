import * as fs from 'fs';
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

type ReportType = 'pending' | 'zero-score';

async function processTeacherReports(teacherId?: string, reportType: ReportType = 'pending') {
  try {
    // Read the appropriate reports file
    const fileName = reportType === 'pending' ? 'pending-reports.json' : 'zero-score-reports.json';
    const reportData = fs.readFileSync(fileName, 'utf-8');
    const report: Report = JSON.parse(reportData);

    if (teacherId) {
      // Process single teacher
      const teacherReports = report.teachers.find(t => t.teacherId === teacherId);
      
      if (!teacherReports) {
        console.log(`No ${reportType} reports found for teacher ID: ${teacherId}`);
        return;
      }

      await processTeacherReportsList([teacherReports], reportType);
    } else {
      // Process all teachers
      console.log(`Processing ${reportType} reports for all ${report.teachers.length} teachers`);
      await processTeacherReportsList(report.teachers, reportType);
    }
  } catch (error) {
    console.error(`Error processing ${reportType} teacher reports:`, error);
    process.exit(1);
  }
}

async function processTeacherReportsList(teachers: TeacherReports[], reportType: ReportType) {
  for (const teacher of teachers) {
    console.log(`Processing ${teacher.pendingReports.length} ${reportType} reports for teacher: ${teacher.teacherName}`);

    // Process each report
    for (const report of teacher.pendingReports) {
      try {
        // For zero-score reports, check and delete existing analysis results
        if (reportType === 'zero-score') {
          const filePath = `${report.submissionUid}.json`;
          console.log(`Attempting to delete file: ${filePath}`);
          
          try {
            const { error: deleteError } = await supabase
              .storage
              .from('analysis-results')
              .remove([filePath]);

            if (deleteError) {
              console.error(`Error deleting file ${filePath}:`, deleteError);
            } else {
              console.log(`Successfully deleted analysis result for ${report.submissionUid}`);
            }
          } catch (storageError) {
            console.error(`Storage operation error for ${report.submissionUid}:`, storageError);
          }
        }

        // Extract audio URLs from studentAnswers
        const audioUrls = extractAudioUrls(report.studentAnswers);
        
        if (audioUrls.length === 0) {
          console.log(`No audio URLs found for submission ${report.submissionId}`);
          continue;
        }

        // Send to analysis endpoint
        const response = await axios.post('http://localhost:8081/analyze', {
          urls: audioUrls,
          submission_id: report.submissionUid
        });

        console.log(`Successfully sent submission ${report.submissionId} for analysis`);
        
        // Wait 1 second before processing next report
        await setTimeout(1000);
      } catch (error) {
        console.error(`Error processing submission ${report.submissionId}:`, error);
      }
    }

    console.log(`Finished processing all ${reportType} reports for teacher:`, teacher.teacherName);
  }
}

function extractAudioUrls(studentAnswers: any): string[] {
  // This function should be implemented based on your actual data structure
  // For now, returning a placeholder implementation
  const urls: string[] = [];
  
  if (Array.isArray(studentAnswers)) {
    studentAnswers.forEach(answer => {
      if (answer.audioUrl && typeof answer.audioUrl === 'string') {
        urls.push(answer.audioUrl);
      }
    });
  }
  
  return urls;
}

// Get command line arguments
const args = process.argv.slice(2);
const isAll = args.includes('--all') || args.includes('all');
const isZeroScore = args.includes('--zero') || args.includes('zero');
const teacherId = args.find(arg => !['--all', 'all', '--zero', 'zero'].includes(arg));

if (!isAll && !teacherId) {
  console.error('Please provide either a teacher ID or --all flag');
  process.exit(1);
}

// Run the process with the specified report type
processTeacherReports(isAll ? undefined : teacherId, isZeroScore ? 'zero-score' : 'pending'); 