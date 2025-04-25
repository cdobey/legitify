import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { DashboardSkeleton } from './components/SkeletonLoaders';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AccessRequests from './pages/credential/AccessRequests';
import AllRecords from './pages/credential/AllRecords';
import IssueCredential from './pages/credential/IssueCredential';
import ManageCredentials from './pages/credential/ManageCredentials';
import VerifyCredential from './pages/credential/VerifyCredential';
import ViewCredential from './pages/credential/ViewCredential';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import ManageIssuers from './pages/issuer/ManageIssuer';
import ProfilePage from './pages/Profile';
import Settings from './pages/Settings';
import MyIssuers from './pages/user/MyIssuers';
import SearchUsers from './pages/users/SearchUsers';

export default function App() {
  const { user, isLoading } = useAuth();

  // Determines what to show on the homepage route
  const renderHomePage = () => {
    // When loading auth state and we might have a user (not initial load)
    if (isLoading && sessionStorage.getItem('token')) {
      const storedUser = sessionStorage.getItem('user');
      let userRole = 'holder';

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userRole = parsedUser.role;
        } catch (e) {
          console.error('Failed to parse stored user data', e);
        }
      }

      return <DashboardSkeleton userRole={userRole as any} />;
    }

    // When auth is complete, show Dashboard or HomePage
    return user ? <Dashboard /> : <HomePage />;
  };

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={renderHomePage()} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/credential/issue"
          element={
            <ProtectedRoute
              requiredRole="issuer"
              deniedMessage="Only issuers can issue credentials."
            >
              <IssueCredential />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential/all-records"
          element={
            <ProtectedRoute requiredRole="issuer">
              <AllRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential/manage"
          element={
            <ProtectedRoute requiredRole="holder">
              <ManageCredentials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential/requests"
          element={
            <ProtectedRoute requiredRole="holder">
              <AccessRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential/view/:docId"
          element={
            <ProtectedRoute allowedRoles={['verifier', 'issuer']}>
              <ViewCredential />
            </ProtectedRoute>
          }
        />
        <Route
          path="/credential/verify"
          element={
            <ProtectedRoute requiredRole="verifier">
              <VerifyCredential />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/search"
          element={
            <ProtectedRoute requiredRole="verifier">
              <SearchUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuers"
          element={
            <ProtectedRoute requiredRole="holder">
              <MyIssuers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issuer/manage"
          element={
            <ProtectedRoute requiredRole="issuer">
              <ManageIssuers />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/credentials"
          element={
            <ProtectedRoute allowedRoles={['issuer', 'verifier']}>
              <AllRecords />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MainLayout>
  );
}
