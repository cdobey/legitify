import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import { Alert, Container } from '@mantine/core';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "university" | "individual" | "employer";
  deniedMessage?: string;
}

const ProtectedRoute = ({ children, requiredRole, deniedMessage }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  // Show nothing while checking authentication
  if (isLoading) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and user doesn't have it, show denied message (if provided), else redirect
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Access Denied">
          {deniedMessage || 'You do not have permission to access this page.'}
        </Alert>
      </Container>
    );
  }

  // User is authenticated and has required role, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
