
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppNavbar from "@/components/AppNavbar";

const CreateClass = () => {
  const [className, setClassName] = useState("");
  const { createClass } = useClass();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!className.trim()) {
      return;
    }
    
    createClass(className);
    navigate("/teacher");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create a New Class</CardTitle>
            <CardDescription>
              Enter a name for your class and we'll generate a unique code for your students.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-name">Class Name</Label>
                <Input
                  id="class-name"
                  placeholder="e.g. Math 101"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => navigate("/teacher")}>
                Cancel
              </Button>
              <Button type="submit">Create Class</Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default CreateClass;
