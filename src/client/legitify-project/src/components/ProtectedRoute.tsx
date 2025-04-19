import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { Alert, Container } from '@mantine/core';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'university' | 'individual' | 'employer';
  deniedMessage?: string;
  allowedRoles?: ('university' | 'individual' | 'employer')[];
}

const ProtectedRoute = ({
  children,
  requiredRole,
  deniedMessage,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  // Show nothing while checking authentication
  if (isLoading) {
    return null;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRequiredAccess =
    (!requiredRole && !allowedRoles) ||
    (requiredRole && user.role === requiredRole) ||
    (allowedRoles && allowedRoles.includes(user.role));

  // If user doesn't have required access, show denied message or redirect
  if (!hasRequiredAccess) {
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
