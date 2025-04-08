import { OrgName, Role } from '@prisma/client';
import { Request } from 'express';

// Server-side authenticated user from JWT
export interface AuthUser {
  uid: string;
  role: Role;
  orgName: OrgName;
}

// Extended Request with user property
export interface RequestWithUser extends Request {
  user?: AuthUser;
}

// Function to validate user role
export function validateUserRole(user: AuthUser | undefined, requiredRole: Role): void {
  if (!user) {
    throw new Error('User not authenticated');
  }
  if (user.role !== requiredRole) {
    throw new Error(`Only ${requiredRole} can perform this action`);
  }
}

// Helper function to get user info safely
export function getUserInfo(req: RequestWithUser): AuthUser {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}
