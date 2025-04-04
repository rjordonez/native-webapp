
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClass } from "@/context/ClassContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import AppNavbar from "@/components/AppNavbar";
import { toast } from "sonner";

const JoinClass = () => {
  const [classCode, setClassCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { joinClass } = useClass();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classCode.trim()) {
      toast("Please enter a class code");
      return;
    }
    
    setIsJoining(true);
    
    try {
      const success = await joinClass(classCode);
      if (success) {
        toast.success("Successfully joined class!");
        navigate("/student");
      }
    } catch (error) {
      console.error("Failed to join class:", error);
      toast.error("Failed to join class. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container py-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Join a Class</CardTitle>
            <CardDescription>
              Enter the 6-digit code provided by your teacher to join their class.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-code">Class Code</Label>
                <Input
                  id="class-code"
                  placeholder="Enter 6-digit code"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => navigate("/student")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Class"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default JoinClass;
