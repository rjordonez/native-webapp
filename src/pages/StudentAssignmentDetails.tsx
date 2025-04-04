
import { useState, useEffect } from "react";
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

const StudentAssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignments, submissions, getClassesByUser } = useClass();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | undefined>();
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  
  const assignment = assignments.find(a => a.id === id);
  const classes = getClassesByUser();
  const classItem = classes.find(c => assignment && c.id === assignment.classId);
  
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
  
  // Recording timer
  useEffect(() => {
    let timer: number | undefined;
    
    if (isRecording && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRecording && timeLeft === 0) {
      setIsRecording(false);
      // In a real app, this would stop the recording
      
      // Simulate recording completion
      const newAudioUrls = [...audioUrls];
      newAudioUrls[currentQuestionIndex] = `/mock-audio-${currentQuestionIndex + 1}.mp3`;
      setAudioUrls(newAudioUrls);
      
      // Update submission status to in_progress
      if (currentSubmission) {
        const updatedAnswers = [...currentSubmission.answers];
        updatedAnswers[currentQuestionIndex] = {
          ...updatedAnswers[currentQuestionIndex],
          audioUrl: `/mock-audio-${currentQuestionIndex + 1}.mp3`
        };
        
        setCurrentSubmission({
          ...currentSubmission,
          status: "in_progress",
          answers: updatedAnswers
        });
      }
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording, timeLeft, currentQuestionIndex, audioUrls, currentSubmission]);
  
  if (!assignment || !currentSubmission) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Assignment not found</h2>
            <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }
  
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      
      // Simulate recording completion
      const newAudioUrls = [...audioUrls];
      newAudioUrls[currentQuestionIndex] = `/mock-audio-${currentQuestionIndex + 1}.mp3`;
      setAudioUrls(newAudioUrls);
      
      // Update submission
      const updatedAnswers = [...currentSubmission.answers];
      updatedAnswers[currentQuestionIndex] = {
        ...updatedAnswers[currentQuestionIndex],
        audioUrl: `/mock-audio-${currentQuestionIndex + 1}.mp3`
      };
      
      setCurrentSubmission({
        ...currentSubmission,
        status: "in_progress",
        answers: updatedAnswers
      });
    } else {
      setIsRecording(true);
      setTimeLeft(40); // Reset timer to 40 seconds
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
  
  const submitAssignment = () => {
    if (currentSubmission) {
      // Check if all questions have been answered
      const allAnswered = currentSubmission.answers.every(answer => answer.audioUrl);
      
      if (!allAnswered) {
        alert("Please answer all questions before submitting.");
        return;
      }
      
      // Update submission status to submitted
      const updatedSubmission = {
        ...currentSubmission,
        status: "submitted" as const,
        submittedAt: new Date().toISOString()
      };
      
      // In a real app, this would be saved to the backend
      console.log("Assignment submitted:", updatedSubmission);
      
      // Navigate back to student dashboard
      navigate("/student");
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
                disabled={!audioUrls[currentQuestionIndex]}
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
