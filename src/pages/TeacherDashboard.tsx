
import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppNavbar from "@/components/AppNavbar";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { getClassesByUser } = useClass();
  const classes = getClassesByUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <Button onClick={() => navigate("/create-class")}>Create New Class</Button>
        </div>
        
        {classes.length === 0 ? (
          <div className="bg-muted/40 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-medium mb-2">No classes created yet</h2>
            <p className="text-muted-foreground mb-6">Create your first class to get started.</p>
            <Button onClick={() => navigate("/create-class")}>Create Class</Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle>{classItem.name}</CardTitle>
                  <CardDescription>Class Code: {classItem.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {classItem.students.length} students enrolled
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
