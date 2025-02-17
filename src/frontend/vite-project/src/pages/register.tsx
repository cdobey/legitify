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
  Select,
  Container,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { register } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"university" | "individual" | "employer">("individual");
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { user, token } = await register(username, password, role);
      setUser(user);
      localStorage.setItem("token", token);
      router.push("/");
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  const handleRoleChange = (value: string | null) => {
    if (value === "university" || value === "individual" || value === "employer") {
      setRole(value);
    }
  };

  return (
    <Container size="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          Register
        </Title>
        <Text  size="sm" color="dimmed" style={{ marginBottom: "1rem", textAlign: "center" }}>
          Create a new account to access the system
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
          <Select
            label="Role"
            placeholder="Select a role"
            value={role}
            onChange={(value) => handleRoleChange(value)}
            data={[
              { value: "university", label: "University" },
              { value: "individual", label: "Individual" },
              { value: "employer", label: "Employer" },
            ]}
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
            Register
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default Register;
