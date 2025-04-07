export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  refreshToken: string;
  uid: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  username: string;
  role: 'university' | 'individual' | 'employer';
  orgName?: string;
  // University registration fields
  universityName?: string;
  universityDisplayName?: string;
  universityDescription?: string;
  joinUniversityId?: string;
  universityIds?: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  orgName: string;
  createdAt: string;
  updatedAt: string;
}
