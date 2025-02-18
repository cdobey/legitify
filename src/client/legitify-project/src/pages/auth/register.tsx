import {
  Alert,
  Button,
  Card,
  Container,
  PasswordInput,
  Select,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { register } from "../../services/authService";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    role: "" as "university" | "individual" | "employer",
    orgName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await register(formData);
      setUser(response.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          Register
        </Title>
        <Text
          size="sm"
          c="dimmed"
          style={{ marginBottom: "1rem", textAlign: "center" }}
        >
          Create a new account to get started
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            style={{ marginBottom: "1rem" }}
          />

          <TextInput
            label="Username"
            placeholder="Choose a username"
            required
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            style={{ marginBottom: "1rem" }}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            style={{ marginBottom: "1rem" }}
          />

          <Select
            label="Role"
            placeholder="Select your role"
            required
            value={formData.role}
            onChange={(value) =>
              setFormData({
                ...formData,
                role: (value || "") as "university" | "individual" | "employer",
              })
            }
            data={[
              { value: "university", label: "University" },
              { value: "individual", label: "Individual" },
              { value: "employer", label: "Employer" },
            ]}
            style={{ marginBottom: "1rem" }}
          />

          <TextInput
            label="Organization Name"
            placeholder="Your organization"
            required
            value={formData.orgName}
            onChange={(e) =>
              setFormData({ ...formData, orgName: e.target.value })
            }
            style={{ marginBottom: "1rem" }}
          />

          {error && (
            <Alert color="red" style={{ marginBottom: "1rem" }}>
              {error}
            </Alert>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Register
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default Register;
