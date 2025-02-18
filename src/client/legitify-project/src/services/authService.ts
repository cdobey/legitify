import {
  signOut as firebaseSignOut,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { API_BASE_URL } from "../config";

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  role: "university" | "individual" | "employer";
  orgName: string;
}

export const register = async (data: RegisterData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
};

export const login = async (email: string, password: string) => {
  const auth = getAuth();

  // First sign in with Firebase
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  const token = await userCredential.user.getIdToken();

  // Then verify the token with your backend
  const response = await fetch(`${API_BASE_URL}/auth/test-authenticated`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Authentication failed");
  }

  const data = await response.json();
  return {
    user: data.user,
    token,
  };
};

export const signOut = async () => {
  const auth = getAuth();
  await firebaseSignOut(auth);
};
