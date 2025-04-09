export type UserRole = 'university' | 'individual' | 'employer';
export type OrgName = 'orguniversity' | 'orgindividual' | 'orgemployer';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  orgName: OrgName;
  createdAt?: string;
  updatedAt?: string;
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
}
