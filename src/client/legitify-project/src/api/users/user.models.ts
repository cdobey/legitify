export type UserRole = 'university' | 'individual' | 'employer';
export type OrgName = 'orguniversity' | 'orgindividual' | 'orgemployer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  orgName: string;
  profilePictureUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  twoFactorEnabled?: boolean;
}

export interface TwoFactorState {
  required: boolean;
  tempToken?: string;
  userId?: string;
  email?: string;
  password?: string;
}

// For API responses
export interface UserSearchResult {
  users: User[];
}

// For API parameters
export interface UserDegreesParams {
  userId: string;
}

export interface ServerUserResponse {
  uid: string;
  email: string;
  username: string;
  orgName?: string;
  profilePictureUrl?: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
}

export interface TwoFactorVerifyRequest {
  secret: string;
  token: string;
}

export interface TwoFactorDisableRequest {
  token: string;
}
