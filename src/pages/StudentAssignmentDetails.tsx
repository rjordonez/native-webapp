import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { Assignment, Submission } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Mic, ArrowRight, Check, Square } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import { toast } from "sonner";
import { sendToAnalysisAPI } from "@/lib/api-services";

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
  const [timeLeft, setTimeLeft] = useState(40);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | undefined>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  
  const assignment = useMemo(() => assignments.find(a => a.id === id), [assignments, id]);
  const classes = useMemo(() => getClassesByUser(), [getClassesByUser]);
  const classItem = useMemo(() => 
    assignment ? classes.find(c => c.id === assignment.classId) : undefined,
    [assignment, classes]
  );

  // Derived state for audio URLs
  const audioUrls = useMemo(() => 
    currentSubmission?.answers.map(answer => answer.audioUrl || "") || [],
    [currentSubmission]
  );

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
          const chunks = recordedChunksRef.current;
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
                  
                  return {
                    ...prev,
                    status: "in_progress",
                    answers: updatedAnswers
                  };
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
          
          recordedChunksRef.current = [];
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
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [assignment, user, currentQuestionIndex, uploadAudio]);

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
        status: "not_started",
        answers: assignment.questions.map((_, index) => ({ questionId: index })),
      };
    }
    
    setCurrentSubmission(submission);
  }, [assignment, user, submissions]);

  // Recording timer
  useEffect(() => {
    let timer: number | undefined;
    
    if (isRecording && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, timeLeft]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Modified toggleRecording to clear previous recordings
  const toggleRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      toast.error('Microphone not ready. Please refresh the page.');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      // When starting a new recording, clear the previous saved recording for this question
      if (audioUrls[currentQuestionIndex]) {
        // Clear the saved audio URL from the current submission
        setCurrentSubmission(prev => {
          if (!prev) return prev;
          const updatedAnswers = [...prev.answers];
          updatedAnswers[currentQuestionIndex] = {
            ...updatedAnswers[currentQuestionIndex],
            audioUrl: ""  // Clear the audio URL
          };
          return {
            ...prev,
            answers: updatedAnswers
          };
        });
      }
      
      recordedChunksRef.current = [];
      setIsRecording(true);
      setTimeLeft(40);
      mediaRecorderRef.current.start(100);
    }
  }, [isRecording, stopRecording, audioUrls, currentQuestionIndex]);

  const goToNextQuestion = useCallback(() => {
    if (assignment && currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsRecording(false);
      setTimeLeft(40);
    }
  }, [assignment, currentQuestionIndex]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setIsRecording(false);
      setTimeLeft(40);
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
            <CardTitle>
              Question {currentQuestionIndex + 1} of {assignment.questions.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{assignment.questions[currentQuestionIndex]}</p>
            
            <div className="bg-muted/40 rounded-lg p-6 flex flex-col items-center">
              {audioUrls[currentQuestionIndex] ? (
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
                      onClick={toggleRecording}
                      disabled={isUploading}
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>
                  </div>
                  
                  {isRecording ? (
                    <div className="text-lg font-semibold">
                      Recording: {timeLeft} seconds left
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      {isUploading ? "Processing..." : "Click to start recording"}
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
                  setTimeLeft(40);
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