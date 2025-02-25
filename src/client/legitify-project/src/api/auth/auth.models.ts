export interface RegisterData {
  email: string;
  password: string;
  username: string;
  role: "university" | "individual" | "employer";
  orgName: string;
}

export interface LoginResponse {
  user: UserProfile; // Changed to use UserProfile directly
  token: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  orgName: string;
}
