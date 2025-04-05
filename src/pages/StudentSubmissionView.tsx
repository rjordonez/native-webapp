import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Assignment, Submission } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, MessageSquare, Check } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import React, { useEffect, useState } from 'react';
import ReportHeader from '@/components/report/reportHeader';
import FluencySection, { AudioErrorMarker, AudioErrorItem } from '@/components/report/FluencySection';
import GrammarSection from '@/components/report/GrammarSection';
import { TextError, ErrorType } from '@/components/TranscriptWithErrors';
import { Skeleton } from "@/components/ui/skeleton";

// Report-related interfaces
interface TranscriptPart {
  partNumber: number;
  transcript: string;
  errors: TextError[];
}

interface TestReport {
  id: string;
  title: string;
  date: Date;
  transcript_parts: TranscriptPart[];
  audio_errors: AudioErrorMarker[];
  error_list: AudioErrorItem[];
}

const StudentSubmissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, submissions } = useClass();
  
  // Report state
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  
  const submission = submissions.find(s => s.id === id);
  const assignment = submission 
    ? assignments.find(a => a.id === submission.assignmentId) 
    : undefined;
  
  // Fetch report data if submission exists
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      if (!id) {
        setError("No submission ID provided");
        setLoading(false);
        return;
      }

      // For mockup purposes, always generate a report
      // In a real app, you might want to conditionally show reports for specific submissions
      const mockReportData = {
        id: "mock-report-" + id,
        title: "Language Analysis Report",
        date: new Date(),
        transcript_parts: defaultTranscriptData,
        audio_errors: defaultAudioErrors,
        error_list: defaultErrorList
      };
      
      setReport(mockReportData);
      
      // Optional: Set to true to automatically show the report view
      // Set to false to start with the submission view
      setShowReport(false);
      setLoading(false);
    }, 1000); // Simulate 1 second loading time
    
    return () => clearTimeout(timer);
  }, [id]);
  // Default report data (same as in the original Report component)
  const defaultAudioErrors: AudioErrorMarker[] = [
    { 
      start: 10, 
      end: 15, 
      type: 'fluency', 
      timestamp: 10,
      description: 'Hesitation while explaining the main concept',
      part: 1
    },
    { 
      start: 35, 
      end: 40, 
      type: 'pronunciation', 
      timestamp: 20,
      description: 'Incorrect pronunciation of "methodology"',
      part: 1
    },
    { 
      start: 60, 
      end: 65, 
      type: 'fluency', 
      timestamp: 32,
      description: 'Long pause disrupting the flow of speech',
      part: 1
    },
    { 
      start: 85, 
      end: 90, 
      type: 'pronunciation', 
      timestamp: 47,
      description: 'Mispronounced "particularly"',
      part: 2
    },
    { 
      start: 100, 
      end: 110, 
      type: 'fluency', 
      timestamp: 55,
      description: 'Repeated filler words (um, uh) reducing clarity',
      part: 2
    },
    { 
      start: 120, 
      end: 125, 
      type: 'pronunciation', 
      timestamp: 62,
      description: 'Difficulty with "specifically"',
      part: 3
    },
  ];

  const defaultErrorList: AudioErrorItem[] = [
    { 
      timestamp: 10,
      type: 'fluency',
      description: 'Hesitation while explaining the main concept',
      part: 1
    },
    { 
      timestamp: 20,
      type: 'pronunciation',
      description: 'Incorrect pronunciation of "methodology"',
      part: 1
    },
    { 
      timestamp: 32,
      type: 'fluency',
      description: 'Long pause disrupting the flow of speech',
      part: 1
    },
    { 
      timestamp: 47,
      type: 'pronunciation',
      description: 'Mispronounced "particularly"',
      part: 2
    },
    { 
      timestamp: 55,
      type: 'fluency',
      description: 'Repeated filler words (um, uh) reducing clarity',
      part: 2
    },
    { 
      timestamp: 62,
      type: 'pronunciation',
      description: 'Difficulty with "specifically"',
      part: 3
    },
  ];

  const defaultTranscriptData: TranscriptPart[] = [
    {
      partNumber: 1,
      transcript:
        "During our research project meeting today, I presented the methodology for data collection that we've been implementing over the past six months.",
      errors: [
        {
          start: 0,
          end: 6,
          type: "vocab" as ErrorType,
          suggestion: "During → Throughout",
          explanation: "More formal academic tone for opening statements."
        },
        {
          start: 59,
          end: 70,
          type: "pronunciation" as ErrorType,
          suggestion: "methodology → meth·uh·dol·uh·jee",
          explanation: "The correct pronunciation emphasizes the third syllable."
        },
        {
          start: 138,
          end: 144,
          type: "tense" as ErrorType,
          suggestion: "months → month period",
          explanation: "More precise timeframe for academic presentation."
        }
      ]
    },
    {
      partNumber: 2,
      transcript:
        "The research paper explains the systematic approach we used for collecting data. We received feedback from fifteen participants representing diverse geographic regions.",
      errors: [
        {
          start: 0,
          end: 12,
          type: "article" as ErrorType,
          suggestion: "The research → Our research",
          explanation:
            "Using a possessive pronoun creates better ownership of the work."
        },
        {
          start: 64,
          end: 74,
          type: "vocab" as ErrorType,
          suggestion: "collecting → gathering and analyzing",
          explanation: "More comprehensive description of the research process."
        },
        {
          start: 107,
          end: 114,
          type: "vocab" as ErrorType,
          suggestion: "fifteen → 15",
          explanation:
            "In formal academic writing, numbers over ten are typically written as numerals."
        },
        {
          start: 115,
          end: 140,
          type: "preposition" as ErrorType,
          suggestion: "participants representing → participants from",
          explanation: "More concise phrasing for academic presentation."
        }
      ]
    },
    {
      partNumber: 3,
      transcript:
        "Our analysis revealed three significant findings that support our initial hypothesis. The terminology we selected was designed to elicit authentic responses from participants.",
      errors: [
        {
          start: 28,
          end: 39,
          type: "vocab" as ErrorType,
          suggestion: "significant → key",
          explanation: "More precise academic terminology."
        },
        {
          start: 40,
          end: 48,
          type: "plural" as ErrorType,
          suggestion: "findings → finding",
          explanation: "Singular form to match the specific count mentioned."
        },
        {
          start: 54,
          end: 61,
          type: "tense" as ErrorType,
          suggestion: "support → supports",
          explanation:
            'Verb should agree with singular subject "finding".'
        },
        {
          start: 90,
          end: 101,
          type: "vocab" as ErrorType,
          suggestion: "terminology → vocabulary",
          explanation: "More accessible term for the audience context."
        },
        {
          start: 137,
          end: 146,
          type: "vocab" as ErrorType,
          suggestion: "authentic → genuine",
          explanation: "Preferred term in research contexts."
        }
      ]
    }
  ];
  
  if (!submission || !assignment) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Submission not found</h2>
            <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }
  
  const hasFeedback = submission.feedback?.reviewed;
  
  // Loading state for report
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <Button 
            variant="outline" 
            onClick={() => navigate("/student")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Badge variant="outline">{assignment.topic}</Badge>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Submitted on: {submission.submittedAt ? format(new Date(submission.submittedAt), "MMMM d, yyyy") : "Unknown"}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }
  
  const renderSubmissionView = () => (
    <div className="space-y-6">
      {assignment.questions.map((question, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">Question {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="font-medium">{question}</p>
            
            <div className="bg-muted/20 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Your Response
              </h4>
              {submission.answers[index]?.audioUrl ? (
                <audio 
                  src={submission.answers[index].audioUrl} 
                  controls 
                  className="w-full" 
                />
              ) : (
                <p className="text-muted-foreground">No recording found</p>
              )}
            </div>
            
            {hasFeedback && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium mb-2 flex items-center text-blue-800">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Teacher Feedback
                </h4>
                <p>{submission.feedback?.comment || "Great job with this response!"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
  
  const renderReportView = () => (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="p-8 md:p-12">
        <div className="max-w-3xl mx-auto">
          <ReportHeader title={report?.title || "Language Analysis"} date={report?.date} />
          <FluencySection 
            audioErrors={report?.audio_errors || defaultAudioErrors} 
            errorList={report?.error_list || defaultErrorList} 
          />
          <Separator className="my-12" />
          <GrammarSection transcripts={report?.transcript_parts || defaultTranscriptData} />
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <Button 
          variant="outline" 
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{assignment.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Badge variant="outline">{assignment.topic}</Badge>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              Submitted on: {submission.submittedAt ? format(new Date(submission.submittedAt), "MMMM d, yyyy") : "Unknown"}
            </div>
            {hasFeedback && (
              <Badge className="bg-blue-500">Feedback Available</Badge>
            )}
            {report && (
              <Badge className="bg-green-500">Analysis Report Available</Badge>
            )}
          </div>
        </div>
        
        {report && (
          <div className="mb-6 flex gap-4">
            <Button 
              variant={!showReport ? "default" : "outline"}
              onClick={() => setShowReport(false)}
            >
              View Submission
            </Button>
            <Button 
              variant={showReport ? "default" : "outline"}
              onClick={() => setShowReport(true)}
            >
              View Language Analysis
            </Button>
          </div>
        )}
        
        {showReport && report ? renderReportView() : renderSubmissionView()}
      </main>
    </div>
  );
};

export default StudentSubmissionView;