import { useNavigate, useParams } from "react-router-dom";
import { useClass } from "@/context/ClassContext"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppNavbar from "@/components/AppNavbar";
import { PlusCircle, Users, BookOpen, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { 
    getClassesByUser, 
    getAssignmentsByClass, 
    getAssignmentStats,
    getStudentsByClass,
    getAssignmentSubmissions,
    getClassById,
    loading 
  } = useClass();
  
  const classes = getClassesByUser();
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionTotals, setSubmissionTotals] = useState({}); // New state for totals

  // Load selected class from URL on mount or refresh
  useEffect(() => {
    const loadSelectedClass = async () => {
      if (classId && !loading) {
        const classData = await getClassById(classId);
        if (classData) {
          setSelectedClass(classData);
        } else {
          navigate("/"); // Redirect to dashboard if class not found
        }
      } else if (!classId) {
        setSelectedClass(null); // Base dashboard state
      }
    };
    loadSelectedClass();
  }, [classId, loading, getClassById, navigate]);

  // Calculate submission totals for each class
  useEffect(() => {
    const loadSubmissionTotals = async () => {
      const totals = {};
      for (const classItem of classes) {
        const classAssignments = getAssignmentsByClass(classItem.id);
        let total = 0;
        for (const assignment of classAssignments) {
          const stats = await getAssignmentStats(assignment.id); // Await the async function
          total += stats.submitted || 0;
        }
        totals[classItem.id] = total;
      }
      setSubmissionTotals(totals);
    };

    if (classes.length > 0 && !loading) {
      loadSubmissionTotals();
    }
  }, [classes, getAssignmentsByClass, getAssignmentStats, loading]);

  useEffect(() => {
    if (selectedClass) {
      const loadDetails = async () => {
        const assignments = getAssignmentsByClass(selectedClass.id);
        const students = await getStudentsByClass(selectedClass.id);
        
        // Get stats for all assignments
        const statsPromises = assignments.map(async (assignment) => {
          return await getAssignmentStats(assignment.id); // Await stats
        });
        const assignmentStats = await Promise.all(statsPromises);

        // Get submissions for all assignments
        const allSubmissions = await Promise.all(
          assignments.map(async (assignment) => {
            const subs = await getAssignmentSubmissions(assignment.id);
            return subs.map(s => ({
              ...s,
              assignmentTitle: assignment.title
            }));
          })
        );
        
        setSubmissions(allSubmissions.flat());
        setClassDetails({
          students,
          assignments,
          stats: assignmentStats // Use resolved stats
        });
      };
      
      loadDetails();
    }
  }, [selectedClass, getAssignmentsByClass, getStudentsByClass, getAssignmentSubmissions, getAssignmentStats]);

  if (selectedClass) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container py-8">
          <Button 
            variant="link" 
            className="px-0 mb-4" 
            onClick={() => setSelectedClass(null)}
          >
            ← Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{selectedClass.name}</h1>
            <div className="flex gap-3">
              <Button onClick={() => navigate(`/class/${selectedClass.id}/students`)}>
                <Users size={16} className="mr-2" />
                View Students
              </Button>
              <Button onClick={() => navigate("/create-assignment", { state: { classId: selectedClass.id } })}>
                <PlusCircle size={16} className="mr-2" />
                New Assignment
              </Button>
            </div>
          </div>
          
          {/* Assignment Stats */}
          <div className="grid gap-6 mb-8">
            {classDetails?.assignments.map((assignment, index) => {
              const stats = classDetails.stats[index]; // Use pre-fetched stats
              return (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>
                      Topic: {assignment.topic} - Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Total Students</h3>
                        <p className="text-xl font-semibold">{classDetails.students.length}</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Submitted</h3>
                        <p className="text-xl font-semibold flex items-center gap-1">
                          <CheckCircle className="text-green-500" size={18} /> {stats.submitted || 0}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">In Progress</h3>
                        <p className="text-xl font-semibold">{stats.inProgress || 0}</p>
                      </div>
                    </div>
                    
                    {/* Student Submissions Table */}
                    <h3 className="text-lg font-medium mb-4">Student Submissions</h3>
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
                        {classDetails.students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8">
                              No students enrolled in this class yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          classDetails.students.map((student) => {
                            const submission = submissions.find(
                              s => s.studentId === student.id && s.assignmentId === assignment.id
                            );
                            
                            return (
                              <TableRow key={student.id}>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      submission?.status === 'submitted' ? 'default' : 
                                      submission?.status === 'in_progress' ? 'secondary' : 'outline'
                                    }
                                  >
                                    {submission?.status === 'submitted' ? 'Submitted' :
                                     submission?.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {submission?.submittedAt ? 
                                    new Date(submission.submittedAt).toLocaleString() : '-'}
                                </TableCell>
                                <TableCell>
                                  {submission?.status === 'submitted' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/teacher/submission/${submission.id}`)}
                                    >
                                      Review
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/create-class")}>Create New Class</Button>
            <Button onClick={() => navigate("/create-assignment")} disabled={classes.length === 0}>
              <PlusCircle size={16} className="mr-2" />
              Create Assignment
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-muted/40 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-medium mb-2">No classes created yet</h2>
            <p className="text-muted-foreground mb-6">Create your first class to get started.</p>
            <Button onClick={() => navigate("/create-class")}>Create Class</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => {
              const classAssignments = getAssignmentsByClass(classItem.id);
              const totalSubmissions = submissionTotals[classItem.id] ?? 0; // Use pre-fetched total
              
              return (
                <Card key={classItem.id} className="hover:bg-muted/50 transition">
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                    <CardDescription>Class Code: {classItem.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center">
                        <Users size={18} className="mb-1" />
                        <p className="text-xl font-semibold">{classItem.students.length}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <BookOpen size={18} className="mb-1" />
                        <p className="text-xl font-semibold">{classAssignments.length}</p>
                        <p className="text-xs text-muted-foreground">Assignments</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <CheckCircle size={18} className="mb-1" />
                        <p className="text-xl font-semibold">{totalSubmissions}</p>
                        <p className="text-xs text-muted-foreground">Submissions</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => setSelectedClass(classItem)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;