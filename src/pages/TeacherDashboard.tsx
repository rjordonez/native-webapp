
import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppNavbar from "@/components/AppNavbar";
import { PlusCircle, Users, BookOpen, CheckCircle } from "lucide-react";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { getClassesByUser, getAssignmentsByClass, getAssignmentStats, loading } = useClass();
  const classes = getClassesByUser();

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
              const totalSubmissions = classAssignments.reduce((acc, assignment) => {
                const stats = getAssignmentStats(assignment.id);
                return acc + stats.submitted;
              }, 0);
              
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
                    <Button variant="outline" className="w-full" onClick={() => navigate(`/class/${classItem.id}`)}>
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
