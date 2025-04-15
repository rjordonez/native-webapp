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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Extended Assignment interface to include examples
interface QuestionWithExample {
  question: string;
  example: string;
}

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
  
  const assignment = useMemo(() => assignments.find(a => a.id === id), [assignments, id]);
  const classes = useMemo(() => getClassesByUser(), [getClassesByUser]);
  const classItem = useMemo(() => 
    assignment ? classes.find(c => c.id === assignment.classId) : undefined,
    [assignment, classes]
  );

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
          
          setQuestionTimeLimits(timeLimits);
          
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
      // Fallback to default time limit
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
    
    const questionText = assignment.questions[currentQuestionIndex];
    
    try {
      // Check if the question is in JSON format containing an example
      if (questionText.startsWith('{') && questionText.includes('"question"') && questionText.includes('"example"')) {
        const parsed = JSON.parse(questionText) as QuestionWithExample;
        return {
          question: parsed.question || "",
          example: parsed.example || ""
        };
      }
    } catch (e) {
      console.error("Error parsing question JSON:", e);
    }
    
    // If not JSON or parsing failed, return the original text as the question
    return { 
      question: questionText,
      example: ""
    };
  }, [assignment, currentQuestionIndex]);

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
      mediaRecorderRef.current.stop(); // This will trigger handleStop
      setIsRecording(false);
      // Don't reset timeLeft here, let the next start handle it or the useEffect timer
      // Don't reset recordingStartTime or isStopDisabled here, handleStop does it
    } else {
       // Ensure consistency if called when not recording
       setIsRecording(false);
       setIsStopDisabled(false);
       setRecordingStartTime(null);
    }
  }, [setIsRecording, setIsStopDisabled, setRecordingStartTime]); // Updated dependencies to include setters used

  // Setup media recorder
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const setupRecorder = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        const handleDataAvailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        
        const handleStop = async () => {
          // Reset start time and disabled status when stopped
          setRecordingStartTime(null);
          setIsStopDisabled(false); 

          const chunks = recordedChunksRef.current;
          recordedChunksRef.current = []; 

          if (chunks.length === 0) return; 
          
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          
          if (assignment && user) {
            try {
              setIsUploading(true);
              toast.info("Uploading your recording...");
              const audioUrl = await uploadAudio(assignment.id, currentQuestionIndex, audioBlob);
              
              if (audioUrl) {
                // Update the current submission with the new audio URL
                setCurrentSubmission(prev => {
                  if (!prev) return prev;
                  
                  // Create a deep copy of the answers array
                  const updatedAnswers = [...prev.answers];
                  
                  // Update the current question's audio URL
                  updatedAnswers[currentQuestionIndex] = {
                    ...updatedAnswers[currentQuestionIndex],
                    questionId: currentQuestionIndex,  // Ensure questionId is set
                    audioUrl: audioUrl
                  };
                  
                  // Log the updated state for debugging
                  console.log(`Updated answer for question ${currentQuestionIndex} with URL: ${audioUrl}`);
                  console.log("Updated answers array:", updatedAnswers);
                  
                  // Create updated submission object with correct type
                  const updatedSubmission = {
                    ...prev,
                    status: "in_progress" as const, // Use const assertion to fix the type
                    answers: updatedAnswers
                  };
                  
                  // Persist this change to the context/backend
                  updateSubmission(updatedSubmission)
                    .then(() => console.log("Submission status updated to in_progress"))
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
            }
          }
        };

        recorder.addEventListener('dataavailable', handleDataAvailable);
        recorder.addEventListener('stop', handleStop);
        mediaRecorderRef.current = recorder;
        
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Could not access your microphone. Please check permissions.');
      }
    };

    setupRecorder();
    
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) { console.error("Cleanup stop error:", e); }
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      recordedChunksRef.current = [];
      setRecordingStartTime(null); // Reset on unmount/re-render
      setIsStopDisabled(false);
    };
  }, [assignment, user, currentQuestionIndex, uploadAudio, updateSubmission, setRecordingStartTime, setIsStopDisabled, setIsUploading, setCurrentSubmission]);

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
      // Check elapsed time for disabling stop button
      const now = Date.now();
      const elapsed = recordingStartTime ? now - recordingStartTime : 0;
      
      if (elapsed < MINIMUM_RECORDING_SECONDS * 1000) {
        setIsStopDisabled(true);
      } else {
         // Once 5 seconds have passed, ensure button is enabled
        setIsStopDisabled(false); 
      }

      // Handle countdown timer
      if (timeLeft > 0) {
        timer = window.setInterval(() => {
          setTimeLeft(prev => prev - 1);
          // Re-check elapsed time every second within the timer as well
          const currentElapsed = recordingStartTime ? Date.now() - recordingStartTime : 0;
           if (currentElapsed >= MINIMUM_RECORDING_SECONDS * 1000 && isStopDisabled) {
              setIsStopDisabled(false);
           }
        }, 1000);
      } else {
        // Time ran out, stop recording
        console.log("Timer reached 0, stopping recording.");
        stopRecording(); // Now stopRecording is defined
      }
    } else {
      // Ensure button is not disabled if not recording
      setIsStopDisabled(false);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  // Dependencies include states checked/set inside
  }, [isRecording, timeLeft, recordingStartTime, stopRecording, setIsStopDisabled, isStopDisabled, setTimeLeft]); // Added setTimeLeft

  // Close example dialog when changing questions
  useEffect(() => {
    setShowExampleDialog(false);
  }, [currentQuestionIndex]);

  // toggleRecording: Sets start time or calls stopRecording
  const toggleRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      toast.error('Microphone not ready. Please refresh the page.');
      return;
    }

    if (isRecording) {
      // Stop button was clicked - stopRecording handles the rest
      // The button itself is disabled for the first 5s by the timer effect
      stopRecording(); 
    } else {
      // --- Start Recording ---
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
      
      recordedChunksRef.current = []; 
      setRecordingStartTime(Date.now()); // Set start time
      setIsRecording(true);
      setIsStopDisabled(true); // Initially disable stop button
      // Do not reset timeLeft here, as it's set when question changes
      mediaRecorderRef.current.start(100); 
      toast.info(`Recording started. Minimum duration: ${MINIMUM_RECORDING_SECONDS} seconds.`);
    }
  }, [isRecording, stopRecording, audioUrls, currentQuestionIndex, updateSubmission, setCurrentSubmission, setRecordingStartTime, setIsRecording, setIsStopDisabled]);

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
          
          console.log("Sending audio URLs to analysis API:", audioUrls);
          
          // Verify we have the correct number of URLs
          if (audioUrls.length !== assignment.questions.length) {
            console.warn(`Warning: Expected ${assignment.questions.length} URLs but got ${audioUrls.length}`);
          }
          
          // Only proceed if we have URLs to send
          if (audioUrls.length > 0) {
            // Send to analysis API
            await sendToAnalysisAPI(audioUrls, updatedSubmission.submission_uid);
            console.log("Analysis request sent successfully");
          } else {
            console.error("No audio URLs found to send to analysis API");
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
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Question {currentQuestionIndex + 1} of {assignment.questions.length}</span>
              {hasExample && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowExampleDialog(true)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <HelpCircle className="h-4 w-4 mr-1" /> View Example
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{currentQuestionData.question}</p>
            
            <div className="bg-muted/40 rounded-lg p-6 flex flex-col items-center">
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
                      // Disable stop if uploading OR if minimum time hasn't passed
                      disabled={isUploading || (isRecording && isStopDisabled)} 
                      onClick={toggleRecording}
                      title={isRecording && isStopDisabled ? `Cannot stop for ${MINIMUM_RECORDING_SECONDS} seconds` : (isRecording ? "Stop Recording" : "Start Recording")} // Add tooltip
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
                      {/* Show message only when stop is actually disabled */}
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

        {/* Example Dialog */}
        <AlertDialog open={showExampleDialog} onOpenChange={setShowExampleDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex justify-between items-center">
                <span>Example Answer</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => setShowExampleDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground">
                <div className="mt-2 text-sm bg-muted/30 p-4 rounded-md">
                  {currentExample}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowExampleDialog(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default StudentAssignmentDetails;