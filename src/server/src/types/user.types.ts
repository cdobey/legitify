import { OrgName, Role } from '@prisma/client';
import { Request } from 'express';

export interface RequestUser {
  id: string;
  role: Role;
  orgName: OrgName;
}

// Extended Request with user property
export interface RequestWithUser extends Request {
  user?: RequestUser;
}

// User profile response - what gets sent to clients
export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  orgName: OrgName;
  createdAt: string;
  updatedAt: string;
}

// Function to validate user role
export function validateUserRole(user: RequestUser | undefined, requiredRole: Role): void {
  if (!user) {
    throw new Error('User not authenticated');
  }
  if (user.role !== requiredRole) {
    throw new Error(`Only ${requiredRole} can perform this action`);
  }
}

// Helper function to get user info safely
export function getUserInfo(req: RequestWithUser): RequestUser {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}
