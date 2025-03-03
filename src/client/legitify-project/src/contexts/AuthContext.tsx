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
  refreshSession: () => Promise<boolean>;
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

      // Also store in sessionStorage for backup
      sessionStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // If profile fetch fails, we should still have basic user data
      const fallbackUser: UserProfile = {
        id: authUser.id,
        email: authUser.email || "",
        username: "",
        role: "individual", // This is now explicitly one of the allowed values
        orgName: "",
      };
      setUser(fallbackUser);
      sessionStorage.setItem("user", JSON.stringify(fallbackUser));
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!session?.user) return;
    await fetchUserProfile(session.user);
  };

  // Explicitly refresh the session token
  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error("Failed to refresh session:", error);
        return false;
      }

      setSession(data.session);

      // Update token in sessionStorage
      if (data.session?.access_token) {
        sessionStorage.setItem("token", data.session.access_token);
      }

      return true;
    } catch (error) {
      console.error("Session refresh error:", error);
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Get initial session
        const { data } = await supabase.auth.getSession();
        setSession(data.session);

        if (data.session?.user) {
          // Store token in sessionStorage
          sessionStorage.setItem("token", data.session.access_token);
          await fetchUserProfile(data.session.user);
        } else {
          // Try to recover from saved user if possible
          const savedUser = sessionStorage.getItem("user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }

      // Setup auth state change listener
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);

        if (currentSession?.user) {
          // Update token in sessionStorage
          sessionStorage.setItem("token", currentSession.access_token);
          await fetchUserProfile(currentSession.user);
        } else if (event === "SIGNED_OUT") {
          // Clear everything on sign out
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Explicitly store token after login
    if (data?.session) {
      sessionStorage.setItem("token", data.session.access_token);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    session,
    isLoading,
    login,
    logout,
    refreshUser,
    refreshSession,
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
