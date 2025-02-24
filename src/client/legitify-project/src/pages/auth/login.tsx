import {
  Alert,
  Button,
  Card,
  Container,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../../api/auth/auth.queries";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const login = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await login.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      if (response.user && response.token) {
        setUser(response.user);
        sessionStorage.setItem("user", JSON.stringify(response.user));
        navigate("/");
      } else {
        setError("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to login");
    }
  };

  return (
    <Container size="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          Login
        </Title>
        <Text
          size="sm"
          c="dimmed"
          style={{ marginBottom: "1rem", textAlign: "center" }}
        >
          Enter your credentials to access the system
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
            style={{ marginBottom: "1rem" }}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
            style={{ marginBottom: "1rem" }}
          />

          {error && (
            <Alert color="red" style={{ marginBottom: "1rem" }}>
              {error}
            </Alert>
          )}

          <Button type="submit" fullWidth loading={login.isPending}>
            Login
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default Login;
