import { Box, Container, Text, Title } from "@mantine/core";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
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
  const { loading, user } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

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
            user?.role === "university" ? <IssueDegree /> : <Navigate to="/" />
          }
        />
        <Route
          path="/degree/manage"
          element={
            user?.role === "individual" ? (
              <ManageDegrees />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/degree/requests"
          element={
            user?.role === "individual" ? (
              <AccessRequests />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/degree/view/:docId"
          element={
            user?.role === "employer" ? <ViewDegree /> : <Navigate to="/" />
          }
        />
        <Route
          path="/degree/verify"
          element={
            user?.role === "employer" ? <VerifyDegree /> : <Navigate to="/" />
          }
        />
      </Routes>
    </Box>
  );
}
