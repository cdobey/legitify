import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
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
  const { user } = useAuth();

  return (
    <MainLayout>
      <Routes>
        {/* Show Dashboard for authenticated users, HomePage for others */}
        <Route path="/" element={user ? <Dashboard /> : <HomePage />} />
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
