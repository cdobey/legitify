import { AuthUser, OrgName, UserRole } from '../users/user.models';

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
  role: UserRole;
  orgName?: OrgName;
  // University registration fields
  universityName?: string;
  universityDisplayName?: string;
  universityDescription?: string;
  joinUniversityId?: string;
  universityIds?: string[];
}

// Make UserProfile an extension of AuthUser
export type UserProfile = AuthUser;
