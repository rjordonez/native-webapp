import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { Assignment, Submission } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Mic, MicOff, ArrowRight, Check } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [currentSubmission, setCurrentSubmission] = useState<Submission | undefined>();
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
  
  const assignment = assignments.find(a => a.id === id);
  const classes = getClassesByUser();
  const classItem = assignment ? classes.find(c => c.id === assignment.classId) : undefined;
  
  // Setup media recorder
// Setup media recorder
useEffect(() => {
  const setupRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      });
      
      recorder.addEventListener('stop', async () => {
        // Get the latest state directly to avoid closure issues
        const chunks = recordedChunks;
        const currentIndex = currentQuestionIndex;
        
        // Create a blob from the recorded chunks
        if (chunks.length === 0) return;
        
        const audioBlob = new Blob(chunks, {
          type: 'audio/webm',
        });
        
        // Upload the audio to Supabase
        if (assignment && user) {
          try {
            toast.info("Uploading your recording...");
            const audioUrl = await uploadAudio(assignment.id, currentIndex, audioBlob);
            
            if (audioUrl) {
              // Update the audio URLs array and submission in one step to avoid desynchronization
              setAudioUrls(prev => {
                const newUrls = [...prev];
                newUrls[currentIndex] = audioUrl;
                return newUrls;
              });
              
              setCurrentSubmission(prev => {
                if (!prev) return prev;
                
                const updatedAnswers = [...prev.answers];
                updatedAnswers[currentIndex] = {
                  ...updatedAnswers[currentIndex],
                  audioUrl: audioUrl
                };
                
                const updatedSubmission = {
                  ...prev,
                  status: "in_progress" as const,
                  answers: updatedAnswers
                };
                
                // Update in Supabase
                updateSubmission(updatedSubmission).catch(err => {
                  console.error("Error updating submission:", err);
                });
                
                return updatedSubmission;
              });
              
              toast.success("Recording saved successfully!");
            }
          } catch (error) {
            console.error("Error uploading audio:", error);
            toast.error("Failed to upload recording. Please try again.");
          }
        }
        
        // Clear the recorded chunks for the next recording
        setRecordedChunks([]);
      });
      
      setMediaRecorder(recorder);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access your microphone. Please check your browser permissions.');
    }
  };

  setupRecorder();
  
  // Cleanup function
  return () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };
}, []);
  
  // Initialize or get existing submission
  useEffect(() => {
    if (!assignment || !user) return;
    
    // Find existing submission or create a new one
    let submission = submissions.find(
      s => s.assignmentId === assignment.id && s.studentId === user.id
    );
    
    if (!submission) {
      // This would be handled by the backend in a real app
      submission = {
        id: `temp_${Math.random().toString(36).substring(2, 9)}`,
        assignmentId: assignment.id,
        studentId: user.id,
        status: "not_started",
        answers: assignment.questions.map((_, index) => ({ questionId: index })),
      };
    }
    
    setCurrentSubmission(submission);
    
    // Prepare audio URLs array
    const urls = new Array(assignment.questions.length).fill("");
    submission.answers.forEach(answer => {
      if (answer.audioUrl) {
        urls[answer.questionId] = answer.audioUrl;
      }
    });
    setAudioUrls(urls);
    
  }, [assignment, user, submissions]);
  useEffect(() => {
    console.log("audioUrls updated:", audioUrls);
    console.log("Current submission answers:", currentSubmission?.answers);
    
    // Check if all questions are answered
    const allAnswered = audioUrls.every(url => url !== "");
    console.log("All questions answered:", allAnswered);
  }, [audioUrls, currentSubmission]);
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
  
  const stopRecording = () => {
    console.log("Before stopping recording, audioUrls:", audioUrls);
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setIsRecording(false);
      mediaRecorder.stop();
      // Don't try to update audioUrls here - it will be updated in the 'stop' event listener
    }
  };
  
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
  
  const toggleRecording = () => {
    if (!mediaRecorder) {
      toast.error('Media recorder not initialized. Please check your browser permissions.');
      return;
    }

    if (isRecording) {
      // Stop recording
      stopRecording();
    } else {
      // Start recording
      setIsRecording(true);
      setTimeLeft(40); // Reset timer to 40 seconds
      setRecordedChunks([]); // Clear any previous recording chunks
      mediaRecorder.start(100); // Collect data every 100ms
    }
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < assignment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsRecording(false);
      setTimeLeft(40);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setIsRecording(false);
      setTimeLeft(40);
    }
  };
  
  const submitAssignment = async () => {
    if (currentSubmission) {
      // Check if all questions have been answered
      const allAnswered = currentSubmission.answers.every(answer => answer.audioUrl);
      
      if (!allAnswered) {
        toast.error("Please answer all questions before submitting.");
        return;
      }
      
      // Ask for confirmation before submitting
      if (confirm("Are you sure you want to submit this assignment? You won't be able to make changes after submission.")) {
        try {
          // Show loading toast
          const toastId = toast.loading("Submitting assignment...");
          
          // Update submission status to submitted
          const updatedSubmission = {
            ...currentSubmission,
            status: "submitted" as const,
            submittedAt: new Date().toISOString()
          };
          
          // Process submission in the background without awaiting
          updateSubmission(updatedSubmission)
            .then(() => {
              // Update toast on success
              toast.dismiss(toastId);
              toast.success("Assignment submitted successfully!");
              
              // Now navigate to student dashboard
              navigate("/student");
            })
            .catch((error) => {
              // Handle error
              console.error("Error submitting assignment:", error);
              toast.dismiss(toastId);
              toast.error("Failed to submit assignment. Please try again.");
            });
        } catch (error) {
          console.error("Error preparing submission:", error);
          toast.error("Failed to submit assignment. Please try again.");
        }
      }
      // If user cancels, do nothing and stay on the page
    }
  };
  
  const getProgressPercentage = () => {
    if (!currentSubmission) return 0;
    
    const answeredCount = currentSubmission.answers.filter(a => a.audioUrl).length;
    return (answeredCount / assignment.questions.length) * 100;
  };
  
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
              Progress: {currentSubmission.answers.filter(a => a.audioUrl).length}/{assignment.questions.length} questions answered
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
                    <Button onClick={toggleRecording}>Record Again</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <Button
                      size="lg"
                      className={`rounded-full p-8 ${isRecording ? "bg-red-500 hover:bg-red-600" : ""}`}
                      onClick={toggleRecording}
                    >
                      {isRecording ? (
                        <MicOff className="h-8 w-8" />
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
                      Click to start recording
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
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {currentQuestionIndex < assignment.questions.length - 1 ? (
              <Button 
                onClick={goToNextQuestion}
                disabled={!audioUrls[currentQuestionIndex]}
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
              onClick={submitAssignment}
              disabled={!currentSubmission || !currentSubmission.answers.every(answer => answer.audioUrl)}
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