import React, { createContext, useState, useContext, useEffect } from "react";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types/user";
import { toast } from "sonner";

interface UserProfile {
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // If session changes, fetch the user profile
        if (currentSession?.user) {
          // Use setTimeout to avoid deadlock with auth state change
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.id);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        console.log("Profile fetched successfully:", data);
        setProfile({
          name: data.name,
          role: data.role as UserRole,
        });
      }
    } catch (error) {
      console.error('Error in profile fetch:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for:", email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // No need to manually fetch or redirect - the auth state change listener will handle it
      console.log("Login successful");
      toast.success("Login successful");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: error.message || "Please check your credentials and try again."
      });
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      console.log("Attempting signup for:", email, "with role:", role);
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });
  
      if (error) throw error;
  
      if (data.user) {
        // Create user profile in the database
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            name,
            role,
          });
  
        if (profileError) {
          console.error("Error creating user profile:", profileError);
          throw profileError;
        }
        
        // Add a small delay to allow database to process the insert
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log("Signup successful");
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error("Signup failed", {
        description: error.message || "There was an error creating your account."
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 1. First check if we have a session before attempting to sign out
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        console.log("Session found, signing out...");
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        console.log("No active session found, cleaning up local state only");
        // No active session, but clean up the local state anyway
      }
      
      // 2. Always clean up local state regardless of session status
      setUser(null);
      setProfile(null);
      setSession(null);
      
      console.log("Logout successful");
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
      
      // 3. If there's an AuthSessionMissingError, handle it gracefully
      if (error.message?.includes("Auth session missing")) {
        console.log("Session already expired, cleaning up local state");
        
        // Clean up the local state anyway to ensure user is fully logged out
        setUser(null);
        setProfile(null);
        setSession(null);
        
        toast.success("Logged out successfully");
      } else {
        // It's a different error
        toast.error("Logout failed", {
          description: error.message || "There was an error logging out."
        });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      login, 
      signup, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};