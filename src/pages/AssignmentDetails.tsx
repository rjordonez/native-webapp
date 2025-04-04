
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { mockStudents } from "@/types/user";
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, XCircle, Eye, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { assignments, submissions, getSubmissionsByAssignment, getAssignmentStats } = useClass();
  
  const assignment = assignments.find(a => a.id === id);
  
  if (!assignment) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Assignment Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">The assignment you're looking for doesn't exist.</p>
              <Button onClick={() => navigate(-1)}>Go Back</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const assignmentSubmissions = getSubmissionsByAssignment(assignment.id);
  const stats = getAssignmentStats(assignment.id);
  
  // Get student names for each submission
  const submissionsWithStudentNames = assignmentSubmissions.map(submission => {
    const student = mockStudents.find(s => s.id === submission.studentId);
    return {
      ...submission,
      studentName: student ? student.name : "Unknown Student"
    };
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(`/class/${assignment.classId}`)} 
          className="mb-6"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Class
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">{assignment.title}</h1>
          <p className="text-muted-foreground">
            Topic: {assignment.topic} • Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="grid gap-6 mb-8 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Submitted</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <CheckCircle className="mr-2 text-green-500" size={18} />
              <p className="text-2xl font-bold">{stats.submitted}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">In Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <Clock className="mr-2 text-amber-500" size={18} />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Not Started</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center">
              <XCircle className="mr-2 text-gray-400" size={18} />
              <p className="text-2xl font-bold">{stats.notStarted}</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissionsWithStudentNames.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <p className="text-muted-foreground">No submissions yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  submissionsWithStudentNames.map(submission => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.studentName}</TableCell>
                      <TableCell>
                        {submission.status === "submitted" ? (
                          <Badge className="bg-green-500">
                            <CheckCircle size={14} className="mr-1" /> Submitted
                          </Badge>
                        ) : submission.status === "in_progress" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-500">
                            <Clock size={14} className="mr-1" /> In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-gray-400 text-gray-400">
                            <AlertCircle size={14} className="mr-1" /> Not Started
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.submittedAt ? (
                          formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={submission.status !== "submitted"}
                          onClick={() => navigate(`/submission/${submission.id}`)}
                        >
                          <Eye size={14} className="mr-1" />
                          View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Assignment Questions</h2>
          <Card>
            <CardContent className="p-6">
              <ol className="list-decimal pl-6 space-y-4">
                {assignment.questions.map((question, index) => (
                  <li key={index} className="text-lg">{question}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AssignmentDetails;
