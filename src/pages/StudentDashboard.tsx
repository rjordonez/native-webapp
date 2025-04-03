
import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppNavbar from "@/components/AppNavbar";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { getClassesByUser } = useClass();
  const classes = getClassesByUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <Button onClick={() => navigate("/join-class")}>Join New Class</Button>
        </div>
        
        {classes.length === 0 ? (
          <div className="bg-muted/40 rounded-lg p-12 text-center">
            <h2 className="text-2xl font-medium mb-2">You haven't joined any classes yet</h2>
            <p className="text-muted-foreground mb-6">Join a class using a class code from your teacher.</p>
            <Button onClick={() => navigate("/join-class")}>Join Class</Button>
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
                    Tap to view class details
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">View Class</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
