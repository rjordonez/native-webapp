import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageSquare, Check } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const StudentSubmissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, submissions } = useClass();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Find the submission row by React Router param
  const submission = submissions.find((s) => s.id === id);
  const assignment = submission
    ? assignments.find((a) => a.id === submission.assignmentId)
    : undefined;

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

  // Simulate initial loading (for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // When user clicks "Report," fetch the .json file using the submission_uid
  useEffect(() => {
    const fetchAnalysisResult = async () => {
      try {
        setLoading(true);
        setAnalysisResult(null);
        setError(null);

        // IMPORTANT: Use submission.submission_uid for the file path
        const { data, error: downloadError } = await supabase.storage
          .from("analysis-results")
          .download(`${submission.submission_uid}.json`);

        if (downloadError) {
          throw new Error(downloadError.message);
        }
        const fileText = await data.text();
        const jsonData = JSON.parse(fileText);
        setAnalysisResult(jsonData);
      } catch (e: any) {
        setError(e.message || "Could not load the analysis report.");
      } finally {
        setLoading(false);
      }
    };

    if (showReport) {
      fetchAnalysisResult();
    }
  }, [showReport, submission.submission_uid]);
  console.log("Submission object:", submission);
  // Render the standard audio responses
  const renderSubmissionView = () => (
    <div className="space-y-6">
      {assignment.questions.map((question, index) => (
        <Card key={index}>
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
                <p>{submission.feedback?.comment || "Great job!"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render the raw JSON from Supabase
  const renderReportView = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      );
    }

    if (error) {
      return <div className="text-red-500">Error: {error}</div>;
    }

    if (!analysisResult) {
      return <div>No analysis result found.</div>;
    }

    return (
      <div className="p-4 bg-white border rounded">
        <pre className="whitespace-pre-wrap text-sm">
          {JSON.stringify(analysisResult, null, 2)}
        </pre>
      </div>
    );
  };

  // Loading placeholder for the initial load
  if (loading && !showReport) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <Button variant="outline" onClick={() => navigate("/student")} className="mb-6">
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
                Submitted on:{" "}
                {submission.submittedAt
                  ? format(new Date(submission.submittedAt), "MMMM d, yyyy")
                  : "Unknown"}
              </div>
            </div>
          </div>

          {/* Loading skeletons */}
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full mt-6" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <Button variant="outline" onClick={() => navigate("/student")} className="mb-6">
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
              Submitted on:{" "}
              {submission.submittedAt
                ? format(new Date(submission.submittedAt), "MMMM d, yyyy")
                : "Unknown"}
            </div>
            {hasFeedback && <Badge className="bg-blue-500">Feedback Available</Badge>}
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <Button variant={!showReport ? "default" : "outline"} onClick={() => setShowReport(false)}>
            View Submission
          </Button>
          <Button variant={showReport ? "default" : "outline"} onClick={() => setShowReport(true)}>
            Report
          </Button>
        </div>

        {showReport ? renderReportView() : renderSubmissionView()}
      </main>
    </div>
  );
};

export default StudentSubmissionView;
