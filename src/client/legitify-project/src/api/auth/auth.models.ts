import { OrgName, User, UserRole } from '../users/user.models';

export interface LoginParams {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  refreshToken: string;
  uid: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  userId?: string;
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

export type UserProfile = User;
