import { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../api/auth/auth.models";
import { useProfile } from "../api/auth/auth.queries";
import supabase from "../config/supabase";

interface AuthContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loading: boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = sessionStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load session from Supabase on mount
  useEffect(() => {
    // Initialize Supabase auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // If we have a session, store the token
        sessionStorage.setItem("token", session.access_token);
      } else {
        // If no session, clear the token and user
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setUser(null);
      }
      setSession(session);
      setInitialLoading(false);
    });

    // Check for existing session on load
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        sessionStorage.setItem("token", data.session.access_token);
        setSession(data.session);
      }
      setInitialLoading(false);
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const { data: profile, isLoading: profileLoading } = useProfile(
    !!sessionStorage.getItem("token")
  );

  useEffect(() => {
    if (profile) {
      setUser(profile);
      sessionStorage.setItem("user", JSON.stringify(profile));
    }
  }, [profile]);

  const value = {
    user,
    setUser,
    loading:
      (initialLoading || profileLoading) && !!sessionStorage.getItem("token"),
    session,
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
