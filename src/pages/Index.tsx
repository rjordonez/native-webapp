
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppNavbar from "@/components/AppNavbar";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar showActions={false} />
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold">Native</h1>
          <p className="text-xl text-muted-foreground mx-auto max-w-xl">
            A simple platform for teachers to create virtual classrooms and for students to join them.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
