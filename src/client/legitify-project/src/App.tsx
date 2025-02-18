import { Box, Container, Text, Title } from "@mantine/core";
import { Route, Routes } from "react-router-dom";
import HomePage from "./components/HomePage";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";

function About() {
  return (
    <Container>
      <Title>About</Title>
      <Text>About page coming soon...</Text>
    </Container>
  );
}

export default function App() {
  const { loading } = useAuth();

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
      </Routes>
    </Box>
  );
}
