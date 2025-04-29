import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useClass } from "@/context/ClassContext"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppNavbar from "@/components/AppNavbar";
import { PlusCircle, Users, BookOpen, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


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
    deleteAssignment,
    loading 
  } = useClass();
  
  const classes = getClassesByUser();
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [submissionTotals, setSubmissionTotals] = useState({}); 
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState({});

  // Add this helper function after your state declarations
  const getUniqueSubmittersCount = (assignmentId) => {
    // Count unique students who submitted for this assignment
    const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignmentId && s.status === 'submitted');
    const uniqueStudentIds = new Set(assignmentSubmissions.map(s => s.studentId));
    return uniqueStudentIds.size;
  };

  // Toggle assignment expand/collapse
  const toggleAssignment = (assignmentId) => {
    setExpandedAssignments(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

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
          const stats = await getAssignmentStats(assignment.id); 
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
        setStudentsLoading(true);
        try {
          const assignments = getAssignmentsByClass(selectedClass.id);
          const students = await getStudentsByClass(selectedClass.id);
          
          // Set up expanded state for all assignments
          const initialExpandedState = {};
          assignments.forEach(assignment => {
            initialExpandedState[assignment.id] = false;
          });
          setExpandedAssignments(initialExpandedState);
          
          // Get stats for all assignments
          const statsPromises = assignments.map(async (assignment) => {
            return await getAssignmentStats(assignment.id); 
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
            stats: assignmentStats
          });
        } catch (error) {
          console.error("Error loading class details:", error);
        } finally {
          setStudentsLoading(false);
        }
      };
        
      loadDetails();
    }
  }, [selectedClass]); 

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    
    const success = await deleteAssignment(assignmentToDelete);
    if (success) {
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      
      // Refresh class details after deletion
      if (selectedClass) {
        // Create a new array without the deleted assignment
        const updatedAssignments = classDetails.assignments.filter(
          assignment => assignment.id !== assignmentToDelete
        );
        
        // Get fresh stats for the remaining assignments
        const statsPromises = updatedAssignments.map(async (assignment) => {
          return await getAssignmentStats(assignment.id);
        });
        const assignmentStats = await Promise.all(statsPromises);
        
        // Update the state with the filtered assignments and new stats
        setClassDetails(prev => ({
          ...prev,
          assignments: updatedAssignments,
          stats: assignmentStats
        }));
        
        // Also update submissions by filtering out any for the deleted assignment
        setSubmissions(prev => prev.filter(
          submission => submission.assignmentId !== assignmentToDelete
        ));
      }
    }
  };

  // Get the filter options for status
  const getStatusOptions = () => {
    if (!submissions.length) return ["All"];
    const statuses = new Set(submissions.map(sub => sub.status || "not_started"));
    return ["All", ...Array.from(statuses)];
  };

  if (selectedClass) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppNavbar />
        <main className="flex-1 container max-w-6xl py-8">
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
              <Button onClick={() => navigate("/create-assignment", { state: { classId: selectedClass.id } })}>
                <PlusCircle size={16} className="mr-2" />
                New Assignment
              </Button>
            </div>
          </div>
          
          {/* Class Summary */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <Users size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Students</p>
                    <p className="text-2xl font-semibold">{classDetails?.students.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <BookOpen size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assignments</p>
                    <p className="text-2xl font-semibold">{classDetails?.assignments.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <CheckCircle size={24} className="text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submissions</p>
                    <p className="text-2xl font-semibold">{submissionTotals[selectedClass.id] || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Assignments List */}
          <h2 className="text-xl font-semibold mb-4">Assignments</h2>
          {classDetails?.assignments.length === 0 ? (
            <div className="bg-muted/40 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No assignments created yet.</p>
              <Button onClick={() => navigate("/create-assignment", { state: { classId: selectedClass.id } })} className="mt-4">
                Create Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {classDetails?.assignments.map((assignment, index) => {
                const stats = classDetails.stats[index];
                const isExpanded = expandedAssignments[assignment.id];
                const assignmentSubmissions = submissions.filter(s => s.assignmentId === assignment.id);
                
                return (
                  <Card key={assignment.id} className="overflow-hidden">
                    <CardHeader 
                      className="flex flex-row items-center justify-between cursor-pointer py-4"
                      onClick={() => toggleAssignment(assignment.id)}
                    >
                      <div>
                        <CardTitle className="flex items-center">
                          {assignment.title}
                          <Badge className="ml-2 bg-blue-100 text-blue-800">
                            {getUniqueSubmittersCount(assignment.id)}/{classDetails.students.length} submitted
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignmentToDelete(assignment.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pb-6">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="border rounded-lg p-4">
                            <h3 className="text-sm font-medium mb-2">Total Students</h3>
                            <p className="text-xl font-semibold">{classDetails.students.length}</p>
                          </div>
                          <div className="border rounded-lg p-4">
                            <h3 className="text-sm font-medium mb-2">Submitted</h3>
                            <p className="text-xl font-semibold flex items-center gap-1">
                              <CheckCircle className="text-green-500" size={18} /> {getUniqueSubmittersCount(assignment.id)}
                            </p>
                          </div>
                          <div className="border rounded-lg p-4">
                            <h3 className="text-sm font-medium mb-2">In Progress</h3>
                            <p className="text-xl font-semibold">{stats.inProgress || 0}</p>
                          </div>
                        </div>
                        
                        <Tabs defaultValue="all" className="w-full">
                          <TabsList className="mb-4">
                            <TabsTrigger value="all">All Students</TabsTrigger>
                            <TabsTrigger value="submitted">Submitted</TabsTrigger>
                            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                            <TabsTrigger value="not_started">Not Started</TabsTrigger>
                          </TabsList>
                          
                          {["all", "submitted", "in_progress", "not_started"].map(tabValue => (
                            <TabsContent key={tabValue} value={tabValue} className="mt-0">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted At</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {classDetails.students.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-4">
                                        No students enrolled in this class yet
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    classDetails.students
                                      .filter(student => {
                                        if (tabValue === "all") return true;
                                        
                                        const submission = assignmentSubmissions.find(
                                          s => s.studentId === student.id
                                        );
                                        
                                        const status = submission?.status || "not_started";
                                        return status === tabValue;
                                      })
                                      .map((student) => {
                                        const submission = assignmentSubmissions.find(
                                          s => s.studentId === student.id
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
                                                className={
                                                  submission?.status === 'submitted' ? 'bg-green-500 hover:bg-green-600' : 
                                                  submission?.status === 'in_progress' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
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
  {submission?.grade != null ? submission.grade : "Pending"}
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
                                  
                                  {tabValue !== "all" && classDetails.students.filter(student => {
                                    const submission = assignmentSubmissions.find(
                                      s => s.studentId === student.id
                                    );
                                    const status = submission?.status || "not_started";
                                    return status === tabValue;
                                  }).length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-4">
                                        No students in this category
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this assignment? This action cannot be undone.
                All student submissions for this assignment will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAssignment}
                className="bg-red-500 hover:text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container max-w-6xl py-8">
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
              const totalSubmissions = submissionTotals[classItem.id] ?? 0; 
              
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
              All student submissions for this assignment will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAssignment}
              className="bg-red-500 hover:text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherDashboard;