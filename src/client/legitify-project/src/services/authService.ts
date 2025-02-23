import {
  signOut as firebaseSignOut,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import api from "../utils/api";

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  role: "university" | "individual" | "employer";
  orgName: string;
}

export const register = async (data: RegisterData) => {
  const response = await api.post("/auth/register", data);
  return response.data;
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

  // Store the token
  localStorage.setItem("token", token);

  // Verify with backend
  const response = await api.get("/me");
  return {
    user: response.data,
    token,
  };
};

export const signOut = async () => {
  const auth = getAuth();
  await firebaseSignOut(auth);
  localStorage.removeItem("token");
};
