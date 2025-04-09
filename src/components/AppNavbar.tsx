
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface AppNavbarProps {
  showActions?: boolean;
}

const AppNavbar: React.FC<AppNavbarProps> = ({ showActions = true }) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xl font-bold">Native</Link>
        </div>
        {showActions && user && profile && (
          <div className="flex items-center gap-4">
            <div className="font-medium">
              {profile.name} • {profile.role === "teacher" ? "Teacher" : "Student"}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppNavbar;
