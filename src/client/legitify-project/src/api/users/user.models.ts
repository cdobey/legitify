export type UserRole = 'university' | 'individual' | 'employer';
export type OrgName = 'orguniversity' | 'orgindividual' | 'orgemployer';

// Base interface with minimal properties that's always available
export interface BaseUser {
  id: string;
  role: UserRole;
  orgName: OrgName;
}

// Complete user interface with all properties from the database
export interface User extends BaseUser {
  username: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

// Authentication user - when a user is authenticated
export interface AuthUser extends BaseUser {
  username: string;
  email: string;
}

// For search results
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
