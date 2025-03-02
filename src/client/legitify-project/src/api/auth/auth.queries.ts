import { useMutation, useQuery } from "@tanstack/react-query";
import supabase from "../../config/supabase";
import { UserProfile } from "./auth.models";

// Fetch user profile using supabase auth session
const fetchUserProfile = async (): Promise<UserProfile> => {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) {
    throw new Error("No active session");
  }

  // Fetch user profile from your API
  const response = await fetch("/api/profile", {
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
};

// Use this hook to get the current user profile
export const useProfile = (enabled = true) => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
    enabled,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Registration mutation
export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      // Registration logic using supabase
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            role: data.role,
            orgName: data.orgName,
          },
        },
      });

      if (error) throw new Error(error.message);

      return { success: true };
    },
  });
};

// This is for backwards compatibility with your existing code
// But we're moving away from using this directly
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword(
        credentials
      );

      if (error) throw new Error(error.message);

      if (!data.user) throw new Error("Login failed");

      // Fetch profile from your API
      const profile = await fetchUserProfile();

      return {
        user: profile,
        token: data.session?.access_token,
      };
    },
  });
};
