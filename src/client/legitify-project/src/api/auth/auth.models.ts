export interface RegisterData {
  email: string;
  password: string;
  username: string;
  role: "university" | "individual" | "employer";
  orgName: string;
}

export interface LoginResponse {
  user: UserProfile;
  token: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: "university" | "individual" | "employer";
  orgName: string;
}
