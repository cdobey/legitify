import supabase from "../../config/supabase";
import apiCall from "../apiCall";
import { LoginResponse, RegisterData, UserProfile } from "./auth.models";

export const authApi = {
  register: (data: RegisterData) =>
    apiCall<{ message: string }>({
      method: "post",
      path: "/auth/register",
      params: data,
    }),

  login: async (email: string, password: string) => {
    try {
      // Use Supabase authentication
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { session } = authData;
      if (!session) throw new Error("No session returned from Supabase");

      const token = session.access_token;

      // Store the token in sessionStorage
      sessionStorage.setItem("token", token);

      // Get full user profile from our backend
      const response = await apiCall<UserProfile>({
        method: "get",
        path: "/me",
        config: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      return {
        user: response,
        token,
      } as LoginResponse;
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message === "Invalid login credentials") {
        throw new Error("Invalid email or password");
      }
      throw new Error(error.message || "Failed to login");
    }
  },

  logout: async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();
    sessionStorage.removeItem("token");
  },

  getProfile: () =>
    apiCall<UserProfile>({
      method: "get",
      path: "/me",
    }),
};
