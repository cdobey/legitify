"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  TextInput,
  PasswordInput,
  Card,
  Title,
  Text,
  Alert,
  Container,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/services/authService";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { user, token } = await login(username, password);
      setUser(user);
      localStorage.setItem("token", token);
      router.push("/");
    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <Container size="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          Login
        </Title>
        <Text size="sm" color="dimmed" style={{ marginBottom: "1rem", textAlign: "center" }}>
          Enter your credentials to access the system
        </Text>
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ marginBottom: "1rem" }}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: "1rem" }}
          />
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error"
              color="red"
              radius="md"
              style={{ marginBottom: "1rem" }}
            >
              {error}
            </Alert>
          )}
          <Button type="submit" fullWidth>
            Login
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default Login;
