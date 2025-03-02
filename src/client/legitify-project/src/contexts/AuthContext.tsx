import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../api/auth/auth.models";
import supabase from "../config/supabase";

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile data when we have a session
  const fetchUserProfile = async (authUser: User): Promise<void> => {
    try {
      // Get user metadata from Supabase auth
      const userData = {
        id: authUser.id,
        email: authUser.email || "",
        username: authUser.user_metadata.username || "",
        role: authUser.user_metadata.role || "individual",
        orgName: authUser.user_metadata.orgName || "",
      } as UserProfile;

      setUser(userData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // If profile fetch fails, we should still have basic user data
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        username: "",
        role: "individual",
        orgName: "",
      });
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!session?.user) return;
    await fetchUserProfile(session.user);
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Get initial session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session?.user) {
        await fetchUserProfile(data.session.user);
      }

      setIsLoading(false);

      // Setup auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_, currentSession) => {
        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user);
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    session,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
