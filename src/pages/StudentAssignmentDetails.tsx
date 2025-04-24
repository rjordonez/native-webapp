import React from 'react'
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { Assignment, Submission } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Mic, ArrowRight, Check, Square, HelpCircle, X } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import { toast } from "sonner";
import { sendToAnalysisAPI } from "@/lib/api-services";


// Interface for parsed metadata
interface QuestionWithTimeLimit {
  question: string;
  timeLimit: string;
  example?: string;
}

interface AssignmentMetadata {
  questionsWithTimeLimits: QuestionWithTimeLimit[];
}

// Define the minimum recording duration
const MINIMUM_RECORDING_SECONDS = 5;
const DEFAULT_RECORDING_SECONDS = 60; // Default if no metadata exists




const StudentAssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    assignments, 
    submissions, 
    getClassesByUser, 
    loading, 
    uploadAudio,
    updateSubmission 
  } = useClass();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_RECORDING_SECONDS);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | undefined>();
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null); // Track recording start time
  const [isStopDisabled, setIsStopDisabled] = useState(false); // Track if stop button is disabled by minimum time
  const [questionTimeLimits, setQuestionTimeLimits] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [questionExamples, setQuestionExamples] = useState<string[]>([]);
  const [shouldShowCueCard, setShouldShowCueCard] = useState(true);

  
  const assignment = useMemo(() => assignments.find(a => a.id === id), [assignments, id]);
  const classes = useMemo(() => getClassesByUser(), [getClassesByUser]);
  const classItem = useMemo(() => 
    assignment ? classes.find(c => c.id === assignment.classId) : undefined,
    [assignment, classes]
  );

  const stoppedDueToTabSwitchRef = useRef(false);



  // Parse assignment metadata when assignment changes
  useEffect(() => {
    if (!assignment) return;
    
    try {
      // Check if metadata exists
      if (assignment.metadata) {
        const metadata = JSON.parse(assignment.metadata) as AssignmentMetadata;
        
        if (metadata.questionsWithTimeLimits) {
          // Extract time limits for each question
          const timeLimits = metadata.questionsWithTimeLimits.map(q => 
            parseInt(q.timeLimit, 10) || DEFAULT_RECORDING_SECONDS
          );
          
          // Check if any question has examples - if they do, the teacher enabled cue cards
          // If no examples exist in the metadata, then the teacher disabled cue cards
          const hasAnyExamples = metadata.questionsWithTimeLimits.some(q => q.example !== undefined);
          setShouldShowCueCard(hasAnyExamples);
          
          // Extract examples for each question (empty string if no example)
          const examples = metadata.questionsWithTimeLimits.map(q => q.example || "");
          
          setQuestionTimeLimits(timeLimits);
          setQuestionExamples(examples);
          
          // Set initial time limit for the first question
          if (timeLimits.length > 0) {
            setTimeLeft(timeLimits[0]);
          }
        }
      } else {
        // If no metadata, set default time limits for all questions
        setQuestionTimeLimits(assignment.questions.map(() => DEFAULT_RECORDING_SECONDS));
        setTimeLeft(DEFAULT_RECORDING_SECONDS);
      }
    } catch (error) {
      console.error("Error parsing assignment metadata:", error);
      // Fallback to default time limits if parsing fails
      setQuestionTimeLimits(assignment.questions.map(() => DEFAULT_RECORDING_SECONDS));
      setTimeLeft(DEFAULT_RECORDING_SECONDS);
    }
  }, [assignment]);

  // Update time limit when question changes
  useEffect(() => {
    if (questionTimeLimits.length > 0 && currentQuestionIndex < questionTimeLimits.length) {
      setTimeLeft(questionTimeLimits[currentQuestionIndex]);
    }
  }, [currentQuestionIndex, questionTimeLimits]);

  // Derived state for audio URLs
  const audioUrls = useMemo(() => 
    currentSubmission?.answers.map(answer => answer.audioUrl || "") || [],
    [currentSubmission]
  );
  // Parse the question to extract the question text and example
  const currentQuestionData = useMemo(() => {
    if (!assignment || !assignment.questions[currentQuestionIndex]) return { question: "", example: "" };
    
    return { 
      question: assignment.questions[currentQuestionIndex],
      example: questionExamples[currentQuestionIndex] || ""
    };
  }, [assignment, currentQuestionIndex, questionExamples]);


  

  // Check if the current question has an example
  const hasExample = useMemo(() => {
    return !!(currentQuestionData.example && currentQuestionData.example.trim());
  }, [currentQuestionData]);

  // Get the current example text
  const currentExample = useMemo(() => {
    return currentQuestionData.example || "";
  }, [currentQuestionData]);

  // Define stopRecording *before* the timer useEffect that uses it
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Always reset state consistently regardless of recorder state
    setIsRecording(false);
    setIsStopDisabled(false);
    setRecordingStartTime(null);
  }, []);


  // Add this useEffect to handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRecording) {
        stoppedDueToTabSwitchRef.current = true;
        stopRecording();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRecording, stopRecording]);
  
  // Setup media recorder
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    // Create and configure a new MediaRecorder
    const setupRecorder = async () => {
      try {
        // Clean up any existing recorder first
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Request a fresh microphone stream
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const recorder = new MediaRecorder(stream);
        
        // Define data collection handler
        const handleDataAvailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        // Define recording stop handler
        const handleStop = async () => {
          // Always reset state when recording stops
          setIsRecording(false);
          setIsStopDisabled(false);
          setRecordingStartTime(null);
          
          if (stoppedDueToTabSwitchRef.current) {
            toast.info("Recording stopped because you switched tabs");
            stoppedDueToTabSwitchRef.current = false;
          }
          
          // Process recorded data
          const chunks = recordedChunksRef.current;
          
          // Reset the chunks array before processing to avoid duplicate processing
          recordedChunksRef.current = [];
          
          if (chunks.length === 0) {
            return;
          }
          
          // Create audio blob from chunks
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          
          // Upload the recorded audio
          if (assignment && user) {
            try {
              setIsUploading(true);
              toast.info("Uploading your recording...");
              
              const audioUrl = await uploadAudio(assignment.id, currentQuestionIndex, audioBlob);
              
              if (audioUrl) {
                // Update the submission with the new audio URL
                setCurrentSubmission(prev => {
                  if (!prev) return prev;
                  
                  // Create a deep copy of the answers array
                  const updatedAnswers = [...prev.answers];
                  
                  // Update the current question's audio URL
                  updatedAnswers[currentQuestionIndex] = {
                    ...updatedAnswers[currentQuestionIndex],
                    questionId: currentQuestionIndex,
                    audioUrl: audioUrl
                  };
                  
                  // Create updated submission object with correct type
                  const updatedSubmission = {
                    ...prev,
                    status: "in_progress" as const,
                    answers: updatedAnswers
                  };
                  
                  // Persist this change to the context/backend
                  updateSubmission(updatedSubmission)
                    .catch(err => console.error("Failed to update submission status:", err));
                  
                  return updatedSubmission;
                });
                
                toast.success("Recording saved successfully!");
              }
            } catch (error) {
              console.error("Error uploading audio:", error);
              toast.error("Failed to upload recording. Please try again.");
            } finally {
              setIsUploading(false);
              
              // Re-setup the recorder to ensure we're ready for the next recording
              setTimeout(() => setupRecorder(), 100);
            }
          }
        };
        
        // Register event handlers
        recorder.addEventListener('dataavailable', handleDataAvailable);
        recorder.addEventListener('stop', handleStop);
        
        // Store the recorder reference
        mediaRecorderRef.current = recorder;
        
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Could not access your microphone. Please check permissions.');
      }
    };
    
    // Initial setup
    setupRecorder();
    
    // Cleanup function
    return () => {
      // Stop any active recording
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping recorder during cleanup:", e);
        }
      }
      
      // Release the media stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Clear recording state
      recordedChunksRef.current = [];
      setRecordingStartTime(null);
      setIsStopDisabled(false);
      setIsRecording(false);
    };
  }, [assignment, user, currentQuestionIndex, uploadAudio, updateSubmission]);

  // Initialize submission
  useEffect(() => {
    if (!assignment || !user) return;
    
    let submission = submissions.find(
      s => s.assignmentId === assignment.id && s.studentId === user.id
    );
    
    if (!submission) {
      submission = {
        id: `temp_${Math.random().toString(36).substring(2, 9)}`,
        submission_uid: `unique_${Math.random().toString(36).substring(2, 9)}`,
        assignmentId: assignment.id,
        studentId: user.id,
        status: "not_started" as const,
        answers: assignment.questions.map((_, index) => ({ questionId: index })),
      };
    }
    
    setCurrentSubmission(submission);
  }, [assignment, user, submissions]);

  // Recording timer: Handles countdown AND stop button disable logic
  useEffect(() => {
    let timer: number | undefined;

    if (isRecording) {
      // Verify recordingStartTime exists
      if (recordingStartTime === null) {
        // Create a new start time as recovery
        const recoveryTime = Date.now();
        setRecordingStartTime(recoveryTime);
        
        // Don't start timer until next render when recordingStartTime is set
        return;
      }
      
      // Calculate elapsed time
      const now = Date.now();
      const elapsed = now - recordingStartTime;
      
      // Check if we need to disable the stop button
      if (elapsed < MINIMUM_RECORDING_SECONDS * 1000) {
        setIsStopDisabled(true);
      } else if (isStopDisabled) {
        // Only update if currently disabled to avoid unnecessary renders
        setIsStopDisabled(false);
      }

      // Handle the countdown timer
      if (timeLeft > 0) {
        // Start a new timer
        timer = window.setInterval(() => {
          setTimeLeft(prev => {
            // Prevent going below zero
            return Math.max(0, prev - 1);
          });
          
          // Re-check elapsed time on each tick
          const currentElapsed = recordingStartTime ? Date.now() - recordingStartTime : 0;
          
          // Enable stop button if minimum time reached
          if (currentElapsed >= MINIMUM_RECORDING_SECONDS * 1000 && isStopDisabled) {
            setIsStopDisabled(false);
          }
        }, 1000);
      } else {
        // Time has run out
        stopRecording();
      }
    }
    
    // Cleanup function
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRecording, timeLeft, recordingStartTime, isStopDisabled, stopRecording]);

  // Close example dialog when changing questions
  useEffect(() => {
    setShowExampleDialog(false);
  }, [currentQuestionIndex]);

  // toggleRecording function with logs removed
  const toggleRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      toast.error('Microphone not ready. Please refresh the page.');
      return;
    }

    if (isRecording) {
      // If we're recording, stop it
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Always reset recording state variables to ensure consistency
      setIsRecording(false);
      setIsStopDisabled(false);
      setRecordingStartTime(null);
    } else {
      // --- Start Recording ---
      // First, ensure any previous recording references are cleared
      recordedChunksRef.current = [];
      
      // Reset timer to the question's limit
      const currentTimeLimit = questionTimeLimits[currentQuestionIndex] || DEFAULT_RECORDING_SECONDS;
      setTimeLeft(currentTimeLimit);
      
      // Clear previous audio URL if any
      if (audioUrls[currentQuestionIndex]) {
        setCurrentSubmission(prev => {
          if (!prev) return prev;
          const updatedAnswers = [...prev.answers];
          updatedAnswers[currentQuestionIndex] = { ...updatedAnswers[currentQuestionIndex], audioUrl: "" };
          const updatedSubmission = { ...prev, status: "in_progress" as const, answers: updatedAnswers };
          const hasAnyRecordings = updatedAnswers.some(a => a.audioUrl && a.audioUrl.trim() !== "");
          if (hasAnyRecordings) {
            updateSubmission(updatedSubmission).catch(err => console.error("Failed update:", err));
          }
          return updatedSubmission;
        });
      }
      
      // Only start recording if the mediaRecorder is in the correct state
      if (mediaRecorderRef.current.state === 'inactive') {
        // Set the start time explicitly before starting the recorder
        const newStartTime = Date.now();
        
        // Begin with stop button disabled
        setIsStopDisabled(true);
        
        // Set the recording start time
        setRecordingStartTime(newStartTime);
        
        // Create a small delay to ensure state updates have completed
        setTimeout(() => {
          // Start the actual recording
          mediaRecorderRef.current?.start(100);
          
          // Only set isRecording to true after everything else is set up
          setIsRecording(true);
          
          toast.info(`Recording started. Minimum duration: ${MINIMUM_RECORDING_SECONDS} seconds.`);
        }, 50); // Small delay to ensure state updates
      } else {
        console.error("MediaRecorder in unexpected state:", mediaRecorderRef.current.state);
        toast.error("Recording error. Please refresh the page and try again.");
      }
    }
  }, [isRecording, audioUrls, currentQuestionIndex, updateSubmission, questionTimeLimits]);

  const goToNextQuestion = useCallback(() => {
    if (assignment && currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsRecording(false);
      // Time limit will be updated in the useEffect that watches currentQuestionIndex
    }
  }, [assignment, currentQuestionIndex]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setIsRecording(false);
      // Time limit will be updated in the useEffect that watches currentQuestionIndex
    }
  }, [currentQuestionIndex]);

  const submitAssignment = useCallback(async () => {
    if (!currentSubmission || !assignment) return;
    
    const allAnswered = currentSubmission.answers.every(answer => answer.audioUrl);
    if (!allAnswered) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    
    if (confirm("Are you sure you want to submit? You won't be able to make changes after.")) {
      try {
        const toastId = toast.loading("Submitting assignment...");
        const updatedSubmission = {
          ...currentSubmission,
          status: "submitted" as const,
          submittedAt: new Date().toISOString()
        };
        
        // First update the submission status
        await updateSubmission(updatedSubmission);
        
        // Then send the audio URLs to the analysis API
        try {
          // Get all the audio URLs from the answers
          const audioUrls = updatedSubmission.answers
            .map(answer => answer.audioUrl)
            .filter(url => url && url.trim() !== "") as string[];
          
          // Only proceed if we have URLs to send
          if (audioUrls.length > 0) {
            // Send to analysis API
            await sendToAnalysisAPI(audioUrls, updatedSubmission.submission_uid);
          } else {
            toast.warning("Your submission was saved, but no audio recordings were found for analysis.");
          }
        } catch (apiError) {
          // Log the error but don't fail the submission
          console.error("Error sending to analysis API:", apiError);
          // Optionally notify the user that analysis might be delayed
          toast.warning("Your submission was saved, but audio analysis may be delayed.");
        }
        
        toast.dismiss(toastId);
        toast.success("Assignment submitted successfully!");
        navigate("/student");
      } catch (error) {
        console.error("Error submitting assignment:", error);
        toast.error("Failed to submit. Please try again.");
      }
    }
  }, [currentSubmission, assignment, updateSubmission, navigate]);
  
  const getProgressPercentage = useCallback(() => {
    if (!currentSubmission || !assignment) return 0;
    const answeredCount = currentSubmission.answers.filter(a => a.audioUrl).length;
    return (answeredCount / assignment.questions.length) * 100;
  }, [currentSubmission, assignment]);

  // Helper function to format time for display
  const formatTimeDisplay = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds === 60) {
      return `1 minute`;
    } else if (seconds % 60 === 0) {
      return `${seconds / 60} minutes`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }, []);

  if (loading || !assignment || !currentSubmission) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="text-center">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <h2 className="text-2xl font-semibold mb-4">Assignment not found</h2>
                <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

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
              {format(new Date(assignment.dueDate), "MMMM d, yyyy")}
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}
            </div>
            {classItem && (
              <div>Class: {classItem.name}</div>
            )}
          </div>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Progress: {currentSubmission.answers.filter(a => a.audioUrl).length}/{assignment.questions.length} answered
            </span>
            <span className="text-sm font-medium">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>
        
        <Card className="mb-8">
  <CardTitle className="w-full px-6 pt-6 flex items-center">
    <span>Question {currentQuestionIndex + 1} of {assignment.questions.length}</span>
  </CardTitle>
  <CardContent className="flex flex-col gap-8 p-6">
    {/* First section: Question text and optionally cue card */}
    <div className="border rounded-lg p-6 bg-muted/40">
      {shouldShowCueCard ? (
        <h2 className="text-2xl font-bold mb-4">Cue Card</h2>
      ) : (
        <h2 className="text-2xl font-bold mb-4">Question</h2>
      )}
      
      <p className="text-xl font-semibold mb-4">{currentQuestionData.question}</p>
      
      {shouldShowCueCard && hasExample && (
        <div className="mt-4">
          <ul className="list-disc pl-5 space-y-1">
            {currentExample.split('\n').map((line, i) => (
              line.trim() ? 
                <li key={i} className="ml-0 text-lg">
                  {line.trim().startsWith('- ') ? line.substring(2) : line.startsWith('-') ? line.substring(1) : line}
                </li>
              : null
            ))}
          </ul>
        </div>
      )}
    </div>

    {/* Second section: Recording UI in a separate container */}
    <div className="border rounded-lg p-6 bg-muted/40 flex flex-col items-center">
      {audioUrls[currentQuestionIndex] && !isRecording ? (
        <div className="w-full">
          <div className="mb-4 text-center text-green-600 font-medium flex items-center justify-center">
            <Check className="mr-2 h-5 w-5" />
            Recording Complete
          </div>
          <audio 
            src={audioUrls[currentQuestionIndex]} 
            controls 
            className="w-full" 
          />
          <div className="mt-4 text-center">
            <Button 
              onClick={toggleRecording}
              disabled={isUploading}
            >
              {isUploading ? "Processing..." : "Record Again"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-4">
            <Button
              size="lg"
              className={`rounded-full p-8 ${isRecording ? "bg-red-500 hover:bg-red-600" : ""}`}
              disabled={isUploading || (isRecording && isStopDisabled)}
              onClick={toggleRecording}
              title={
                isRecording && isStopDisabled 
                  ? `Cannot stop for ${MINIMUM_RECORDING_SECONDS} seconds` 
                  : (isRecording ? "Stop Recording" : "Start Recording")
              }
            >
              {isRecording ? (
                <Square className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
          </div>
          
          {isRecording ? (
            <>
              <div className="text-lg font-semibold mb-2">
                Recording: {formatTimeDisplay(timeLeft)} left
              </div>
              {isStopDisabled && ( 
                <div className="text-sm text-blue-500">
                  Minimum recording time: {MINIMUM_RECORDING_SECONDS} seconds (cannot stop yet)
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">
              {isUploading ? "Processing..." : `Click to start recording (${formatTimeDisplay(timeLeft)} max)`}
            </div>
          )}
        </div>
      )}
    </div>
  </CardContent>

  <CardFooter className="flex justify-between">
    <Button 
      variant="outline" 
      onClick={goToPreviousQuestion}
      disabled={currentQuestionIndex === 0 || isUploading}
    >
      <ArrowLeft className="mr-2 h-4 w-4" /> Previous
    </Button>
    
    {currentQuestionIndex < assignment.questions.length - 1 ? (
      <Button 
        onClick={goToNextQuestion}
        disabled={!audioUrls[currentQuestionIndex] || isUploading}
      >
        Next <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    ) : (
      <Button 
        onClick={submitAssignment}
        disabled={!currentSubmission.answers.every(answer => answer.audioUrl) || isUploading}
      >
        Submit Assignment <Check className="ml-2 h-4 w-4" />
      </Button>
    )}
  </CardFooter>
</Card>
        
        <div className="flex justify-center mb-8">
          <div className="flex gap-2">
            {assignment.questions.map((_, index) => (
              <Button
                key={index}
                variant={currentQuestionIndex === index ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 p-0 ${audioUrls[index] ? "border-green-500" : ""}`}
                onClick={() => {
                  setCurrentQuestionIndex(index);
                  setIsRecording(false);
                  // Time limit will be updated in the useEffect
                }}
                disabled={isUploading}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>

      
      </main>
    </div>
  );
};

export default StudentAssignmentDetails;