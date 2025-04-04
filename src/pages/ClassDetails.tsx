
import { useParams, useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Calendar, CheckCircle, Clock, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ClassDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { classes, getAssignmentsByClass, getAssignmentStats } = useClass();
  
  const classItem = classes.find(c => c.id === id);
  if (!classItem) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Class Not Found</CardTitle>
              <CardDescription>The class you're looking for doesn't exist</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => navigate("/teacher")}>Back to Dashboard</Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  const assignments = getAssignmentsByClass(classItem.id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher")} className="mr-4">
            Back
          </Button>
          <h1 className="text-3xl font-bold">{classItem.name}</h1>
        </div>
        
        <div className="grid gap-6 mb-8 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Class Code</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold">{classItem.code}</p>
              <p className="text-sm text-muted-foreground mt-1">Share with your students</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{classItem.students.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total enrolled students</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Created assignments</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Assignments</h2>
          <Button onClick={() => navigate("/create-assignment", { state: { classId: classItem.id } })}>
            <PlusCircle size={16} className="mr-2" />
            Create Assignment
          </Button>
        </div>
        
        {assignments.length === 0 ? (
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-medium mb-2">No assignments yet</h3>
              <p className="text-muted-foreground mb-6">Create your first assignment to get started.</p>
              <Button onClick={() => navigate("/create-assignment", { state: { classId: classItem.id } })}>
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const stats = getAssignmentStats(assignment.id);
                  const dueDatePassed = new Date(assignment.dueDate) < new Date();
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>{assignment.topic}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-2" />
                          <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                          {dueDatePassed && <AlertCircle size={14} className="ml-2 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CheckCircle size={14} className="mr-2" />
                          <span>{stats.submitted}/{stats.total} submitted</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-2" />
                          <span>{formatDistanceToNow(new Date(assignment.createdAt), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate(`/assignment/${assignment.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClassDetails;
