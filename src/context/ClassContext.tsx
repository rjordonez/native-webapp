
import React, { createContext, useState, useContext, useEffect } from "react";
import { Class } from "@/types/user";
import { useAuth } from "./AuthContext";
import { toast } from "@/components/ui/sonner";

interface ClassContextType {
  classes: Class[];
  createClass: (name: string) => void;
  joinClass: (code: string) => boolean;
  getClassesByUser: () => Class[];
}

const ClassContext = createContext<ClassContextType>({
  classes: [],
  createClass: () => {},
  joinClass: () => false,
  getClassesByUser: () => [],
});

export const useClass = () => useContext(ClassContext);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // Load classes from localStorage
    const savedClasses = localStorage.getItem("classes");
    if (savedClasses) {
      setClasses(JSON.parse(savedClasses));
    }
  }, []);

  // Save classes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("classes", JSON.stringify(classes));
  }, [classes]);

  const generateRandomCode = (): string => {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const createClass = (name: string) => {
    if (!user) return;

    const code = generateRandomCode();
    const newClass: Class = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      code,
      teacherId: user.id,
      students: [],
    };

    setClasses([...classes, newClass]);
    toast(`Class created with code: ${code}`);
  };

  const joinClass = (code: string): boolean => {
    if (!user) return false;

    const classToJoin = classes.find(c => c.code === code);
    
    if (!classToJoin) {
      toast("Class not found", {
        description: "Please check the class code and try again."
      });
      return false;
    }

    if (classToJoin.students.includes(user.id)) {
      toast("Already joined", {
        description: "You are already a member of this class."
      });
      return false;
    }

    const updatedClasses = classes.map(c => {
      if (c.id === classToJoin.id) {
        return {
          ...c,
          students: [...c.students, user.id]
        };
      }
      return c;
    });

    setClasses(updatedClasses);
    toast("Class joined successfully!");
    return true;
  };

  const getClassesByUser = (): Class[] => {
    if (!user) return [];
    
    if (user.role === "teacher") {
      return classes.filter(c => c.teacherId === user.id);
    } else {
      return classes.filter(c => c.students.includes(user.id));
    }
  };

  return (
    <ClassContext.Provider value={{ classes, createClass, joinClass, getClassesByUser }}>
      {children}
    </ClassContext.Provider>
  );
};
