import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageSquare, Check, Play } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

// Voice Tutor Report Component
const VoiceTutorReport = ({ data }) => {
  const [activeAnalysisIndex, setActiveAnalysisIndex] = useState(0);
  const [audioRef, setAudioRef] = useState(null);
  
  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Helper function to determine color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'; // Changed from green to gray
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get score label
  const getScoreLabel = (score) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'Critical';
  };

  const report = data;
  
  // Check if we have any analysis data
  if (!report.pronunciation_analysis || report.pronunciation_analysis.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Voice Pronunciation Report</h1>
        <p className="mt-4 text-gray-600">No pronunciation analysis data available.</p>
      </div>
    );
  }
  
  // Get the currently active analysis
  const analysis = report.pronunciation_analysis[activeAnalysisIndex];
  
  // Calculate actual scores
  const calculateOverallScore = () => {
    if (!analysis.word_details || analysis.word_details.length === 0) return 0;
    const sum = analysis.word_details.reduce((acc, word) => acc + word.accuracy_score, 0);
    return Math.round(sum / analysis.word_details.length);
  };
  
  const overallScore = analysis.overall_pronunciation_score || calculateOverallScore();

  // Function to play word at timestamp and stop after duration
  const playWordAtTimestamp = (offset, duration) => {
    if (audioRef) {
      audioRef.currentTime = offset;
      audioRef.play();
      
      // Set timeout to pause after the word duration
      setTimeout(() => {
        audioRef.pause();
      }, duration * 1000); // Convert duration to milliseconds
    }
  };

  // Filter to only show problematic words (accuracy < 80)
  const problemWords = analysis.word_details ? 
    analysis.word_details.filter(word => word.accuracy_score < 80) : 
    [];

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Voice Pronunciation Report</h1>
        <div className="flex justify-between mt-2">
          <p className="text-gray-500">Submission ID: {report.submission_id}</p>
          <p className="text-gray-500">Date: {formatDate(report.timestamp)}</p>
        </div>
        <div className="mt-2 flex items-center">
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            {report.status}
          </span>
          <span className="ml-4 text-gray-500">Audio Duration: {analysis.audio_duration}s</span>
        </div>
      </div>

      {/* Question Selector */}
      {report.pronunciation_analysis.length > 1 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Select Question</h2>
          <div className="flex gap-2">
            {report.pronunciation_analysis.map((_, index) => (
              <button
                key={index}
                className={`px-4 py-2 rounded ${
                  activeAnalysisIndex === index
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
                onClick={() => setActiveAnalysisIndex(index)}
              >
                Question {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Player */}
      {analysis.url && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Recording for Question {activeAnalysisIndex + 1}</h2>
          <div className="flex items-center">
            <audio 
              controls 
              src={analysis.url} 
              className="w-full"
              ref={ref => setAudioRef(ref)}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Transcript</h2>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-gray-800">{analysis.transcript}</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Overall Score</h2>
        <div className="flex items-center">
          <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
          <div className="ml-4">
            <div className="w-48 bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${overallScore >= 80 ? 'bg-green-600' : overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${overallScore}%` }}
              ></div>
            </div>
            <p className={`text-sm mt-1 ${getScoreColor(overallScore)}`}>
              {getScoreLabel(overallScore)}
            </p>
          </div>
        </div>
      </div>

      {/* Problem Words (Only Yellow and Red) */}
      {problemWords.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Problem Words</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Play</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {problemWords.map((word, index) => (
                  <tr key={index} className={word.accuracy_score < 60 ? "bg-red-50" : "bg-yellow-50"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{word.word}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{word.offset.toFixed(2)}s</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${getScoreColor(word.accuracy_score)}`}>
                          {word.accuracy_score}
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${word.accuracy_score >= 80 ? 'bg-gray-500' : word.accuracy_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${word.accuracy_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {word.error_type !== "None" ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {word.error_type}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Needs Improvement
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        className="p-1 rounded-full hover:bg-gray-100"
                        onClick={() => playWordAtTimestamp(word.offset, word.duration)}
                      >
                        <Play size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    
      {/* Improvement Suggestions */}
      {analysis.improvement_suggestion && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Improvement Suggestions</h2>
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-blue-800">{analysis.improvement_suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentSubmissionView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assignments, submissions } = useClass();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

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
    let timeoutId = null;
    
    const fetchAnalysisResult = async (retryCount = 0, maxRetries = 12) => {
      try {
        setLoading(true);
        
        console.log(`Attempt ${retryCount + 1}: Fetching analysis for submission_uid: ${submission.submission_uid}`);

        const { data, error: downloadError } = await supabase.storage
          .from("analysis-results")
          .download(`${submission.submission_uid}.json`);

        if (downloadError) {
          // If we haven't reached max retries yet, schedule another attempt
          if (retryCount < maxRetries) {
            console.log(`Retry scheduled in 10 seconds...`);
            timeoutId = setTimeout(() => fetchAnalysisResult(retryCount + 1, maxRetries), 10000); // 10 seconds between attempts
            return;
          }
          throw new Error(downloadError.message);
        }
        
        const fileText = await data.text();
        const jsonData = JSON.parse(fileText);
        
        console.log("Analysis data loaded successfully");
        setAnalysisResult(jsonData);
        setLoading(false);
      } catch (e) {
        console.error("Error loading analysis:", e);
        
        // If we haven't reached max retries yet, schedule another attempt
        if (retryCount < maxRetries) {
          console.log(`Retry scheduled in 10 seconds...`);
          timeoutId = setTimeout(() => fetchAnalysisResult(retryCount + 1, maxRetries), 10000); // 10 seconds between attempts
          return;
        }
        
        setError(e.message || "Could not load the analysis report.");
        setLoading(false);
      }
    };

    if (showReport) {
      fetchAnalysisResult();
    } else {
      setLoading(false);
    }
    
    // Cleanup function to cancel any pending timeouts
    return () => {
      if (timeoutId) {
        console.log("Cleaning up - clearing scheduled fetch timeout");
        clearTimeout(timeoutId);
      }
    };
  }, [showReport, submission.submission_uid]);
  
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

  // Render the Voice Tutor Report
  const renderReportView = () => {
    if (loading) {
      return (
        <div className="space-y-4 p-6 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold mb-4">Loading Pronunciation Report</h2>
          <p className="text-gray-600 mb-6">
            Please wait while we generate your pronunciation analysis. 
            This may take up to 2 minutes to complete.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">Error Loading Report</h2>
          <p className="mt-4 text-gray-600">
            We couldn't load your pronunciation report after multiple attempts.
            Please try again later or contact support if this issue persists.
          </p>
          <Button 
            className="mt-4" 
            onClick={() => {
              setLoading(true);
              setError(null);
              setShowReport(false);
              setTimeout(() => setShowReport(true), 100);
            }}
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (!analysisResult) {
      return (
        <div className="p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">No Analysis Available</h2>
          <p className="text-gray-600">
            The pronunciation analysis for this submission is not available yet.
          </p>
        </div>
      );
    }

    // Pass the data to our VoiceTutorReport component
    return <VoiceTutorReport data={analysisResult} />;
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
            Pronunciation Report
          </Button>
        </div>

        {showReport ? renderReportView() : renderSubmissionView()}
      </main>
    </div>
  );
};

export default StudentSubmissionView;