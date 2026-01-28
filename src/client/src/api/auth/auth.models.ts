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
  firstName?: string;
  lastName?: string;
  country?: string;
  role: UserRole;
  orgName?: OrgName;
  // Issuer registration fields
  issuerName?: string;
  issuerDisplayName?: string;
  issuerDescription?: string;
  joinIssuerId?: string;
  issuerIds?: string[];
}

export type UserProfile = User;

export interface ServiceStatus {
  online: boolean;
  message?: string;
  timestamp?: string;
}

export interface SystemStatus {
  backend: ServiceStatus;
  ledger: ServiceStatus;
}
