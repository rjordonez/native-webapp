import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import AppNavbar from "@/components/AppNavbar";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";
import posthog from 'posthog-js';
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getClassesByUser,
    getPendingAssignments,
    getCompletedAssignments,
    submissions,
    loading,
    assignments
  } = useClass();

  const classes = getClassesByUser();
  const pendingAssignments = getPendingAssignments(user?.id || '');
  const completedAssignments = getCompletedAssignments(user?.id || '');

  const getSubmissionStatus = useCallback((assignmentId: string) => {
    const submission = submissions.find(s =>
      s.assignmentId === assignmentId &&
      s.studentId === user?.id
    );
    return submission?.status || "not_started";
  }, [submissions, user?.id]);

  const formatDueDate = useCallback((dateString: string) => {
    try {
      const dueDate = new Date(dateString);
      return formatDistanceToNow(dueDate, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  }, []);

  const getStatusBadge = useCallback((status: "not_started" | "in_progress" | "submitted") => {
    switch (status) {
      case "not_started":
        return <Badge variant="outline" className="ml-2">Not Started</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">In Progress</Badge>;
      case "submitted":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 ml-2">Submitted</Badge>;
      default:
        return null;
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <div className="flex gap-4">
            <Button
              onClick={() => {
                posthog.capture('clicked_ielts_test_button', {
                  userId: user?.id,
                });
                window.open("https://speakingpractice.vercel.app", "_blank", "noopener,noreferrer");
              }}
            >
              IELTS Test
            </Button>
            <Button onClick={() => navigate("/join-class")}>Join New Class</Button>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-muted/40 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-medium mb-2">You haven't joined any classes yet</h2>
            <p className="text-muted-foreground mb-6">Join a class using a class code from your teacher.</p>
            <Button onClick={() => navigate("/join-class")}>Join Class</Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Classes section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Classes</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle>{classItem.name}</CardTitle>
                      <CardDescription>Class Code: {classItem.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {assignments.filter(a => a.classId === classItem.id).length} assignments
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/student/class/${classItem.id}`)}
                      >
                        View Class
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Pending assignments section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Pending Assignments</h2>
              {pendingAssignments.length === 0 ? (
                <p className="text-muted-foreground">No pending assignments at the moment.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pendingAssignments.map((assignment) => {
                    const classItem = classes.find(c => c.id === assignment.classId);
                    const status = getSubmissionStatus(assignment.id);

                    return (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="truncate">{assignment.title}</CardTitle>
                            {getStatusBadge(status)}
                          </div>
                          <CardDescription>{classItem?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                          <Button
                            className={`w-full ${status === "in_progress" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                            onClick={() => navigate(`/student/assignment/${assignment.id}`)}
                          >
                            {status === "in_progress" ? "Continue Assignment" : "Start Assignment"}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Completed assignments section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Completed Assignments</h2>
              {completedAssignments.length === 0 ? (
                <p className="text-muted-foreground">No completed assignments yet.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {completedAssignments.map((assignment) => {
                    const classItem = classes.find(c => c.id === assignment.classId);
                    const submission = submissions.find(s =>
                      s.assignmentId === assignment.id &&
                      s.studentId === user?.id
                    );

                    return (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="truncate">{assignment.title}</CardTitle>
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                              Submitted
                            </Badge>
                          </div>
                          <CardDescription>{classItem?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center text-sm text-muted-foreground mb-2">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>
                              Submitted {submission?.submittedAt ?
                                formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true }) :
                                'recently'}
                            </span>
                          </div>
                          {submission?.feedback?.reviewed && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                              Feedback Available
                            </Badge>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button
                            className={`w-full ${!submission?.feedback?.reviewed ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                            onClick={() => navigate(`/student/submission/${submission?.id}`)}
                          >
                            {submission?.feedback?.reviewed ? "View Feedback" : "View Submission"}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;