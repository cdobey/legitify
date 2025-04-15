import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import AccessibleDegrees from './pages/degree/AccessibleDegrees';
import AccessRequests from './pages/degree/AccessRequests';
import AllRecords from './pages/degree/AllRecords';
import IssueDegree from './pages/degree/IssueDegree';
import ManageDegrees from './pages/degree/ManageDegrees';
import VerifyDegree from './pages/degree/VerifyDegree';
import ViewDegree from './pages/degree/ViewDegree';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/Profile';
import Settings from './pages/Settings';
import ManageUniversities from './pages/university/ManageUniversities';
import MyUniversities from './pages/user/MyUniversities';
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
          path="/degree/issue"
          element={
            <ProtectedRoute requiredRole="university">
              <IssueDegree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/degree/all-records"
          element={
            <ProtectedRoute requiredRole="university">
              <AllRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/degree/manage"
          element={
            <ProtectedRoute requiredRole="individual">
              <ManageDegrees />
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
          path="/degree/requests"
          element={
            <ProtectedRoute requiredRole="individual">
              <AccessRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/degree/view/:docId"
          element={
            <ProtectedRoute requiredRole="employer">
              <ViewDegree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/degree/verify"
          element={
            <ProtectedRoute requiredRole="employer">
              <VerifyDegree />
            </ProtectedRoute>
          }
        />
        <Route
          path="/degree/accessible"
          element={
            <ProtectedRoute requiredRole="employer">
              <AccessibleDegrees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/search"
          element={
            <ProtectedRoute requiredRole="employer">
              <SearchUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/universities"
          element={
            <ProtectedRoute requiredRole="individual">
              <MyUniversities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/universities/manage"
          element={
            <ProtectedRoute requiredRole="university">
              <ManageUniversities />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}
