import { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../api/auth/auth.models";
import { useProfile } from "../api/auth/auth.queries";

interface AuthContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = sessionStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const { data: profile, isLoading } = useProfile(
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
    loading: isLoading && !!sessionStorage.getItem("token"),
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
