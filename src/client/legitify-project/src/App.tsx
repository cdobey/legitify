import { Box, Container, Text, Title } from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import AccessRequests from "./pages/degree/AccessRequests";
import IssueDegree from "./pages/degree/IssueDegree";
import ManageDegrees from "./pages/degree/ManageDegrees";
import VerifyDegree from "./pages/degree/VerifyDegree";
import ViewDegree from "./pages/degree/ViewDegree";
import HomePage from "./pages/HomePage";

function About() {
  return (
    <Container>
      <Title>About</Title>
      <Text>About page coming soon...</Text>
    </Container>
  );
}

export default function App() {
  return (
    <Box>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/degree/issue"
          element={
            <ProtectedRoute requiredRole="university">
              <IssueDegree />
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
      </Routes>
    </Box>
  );
}
