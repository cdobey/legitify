import {
  signOut as firebaseSignOut,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
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
      // First try direct Firebase authentication
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const token = await userCredential.user.getIdToken();

      // Change to sessionStorage
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
      if (error.code === "auth/invalid-login-credentials") {
        throw new Error("Invalid email or password");
      }
      throw new Error(error.message || "Failed to login");
    }
  },

  logout: async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
    sessionStorage.removeItem("token");
  },

  getProfile: () =>
    apiCall<UserProfile>({
      method: "get",
      path: "/me",
    }),
};
