
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Assignment, Submission } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MessageSquare, Check } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { format } from "date-fns";

const StudentSubmissionView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, submissions } = useClass();
  
  const submission = submissions.find(s => s.id === id);
  const assignment = submission 
    ? assignments.find(a => a.id === submission.assignmentId) 
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
          </div>
        </div>
        
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
      </main>
    </div>
  );
};

export default StudentSubmissionView;
