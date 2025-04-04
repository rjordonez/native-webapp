
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { formatDistanceToNow } from "date-fns";

const StudentClassView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classes, assignments, submissions } = useClass();
  
  const classItem = classes.find(c => c.id === id);
  
  // Get all assignments for this class
  const classAssignments = assignments.filter(a => a.classId === id);
  
  // Get student's submissions
  const studentSubmissions = user 
    ? submissions.filter(s => s.studentId === user.id) 
    : [];
  
  if (!classItem) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Class not found</h2>
            <Button onClick={() => navigate("/student")}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }
  
  // Get submission status for an assignment
  const getSubmissionStatus = (assignmentId: string) => {
    const submission = studentSubmissions.find(s => s.assignmentId === assignmentId);
    if (!submission) return "not_started";
    return submission.status;
  };
  
  // Format due date
  const formatDueDate = (dateString: string) => {
    try {
      const dueDate = new Date(dateString);
      return formatDistanceToNow(dueDate, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: "not_started" | "in_progress" | "submitted") => {
    switch (status) {
      case "not_started":
        return <Badge variant="outline" className="ml-2">Not Started</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="ml-2">In Progress</Badge>;
      case "submitted":
        return <Badge variant="default" className="bg-green-500 ml-2">Submitted</Badge>;
      default:
        return null;
    }
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
          <h1 className="text-3xl font-bold mb-2">{classItem.name}</h1>
          <p className="text-muted-foreground">Class Code: {classItem.code}</p>
        </div>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Assignments</h2>
            {classAssignments.length === 0 ? (
              <p className="text-muted-foreground">No assignments in this class yet.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {classAssignments.map((assignment) => {
                  const status = getSubmissionStatus(assignment.id);
                  
                  return (
                    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="truncate">{assignment.title}</CardTitle>
                          {getStatusBadge(status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <Badge variant="outline">{assignment.topic}</Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>Due {formatDueDate(assignment.dueDate)}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-4 w-4" />
                          <span>{assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        {status === "submitted" ? (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
                              if (submission) {
                                navigate(`/student/submission/${submission.id}`);
                              }
                            }}
                          >
                            View Submission
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            onClick={() => navigate(`/student/assignment/${assignment.id}`)}
                          >
                            {status === "in_progress" ? "Continue Assignment" : "Start Assignment"}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default StudentClassView;
