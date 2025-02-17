"use client";

import { useState } from "react";
import {
  Button,
  TextInput,
  Card,
  Title,
  Text,
  Switch,
  Container,
  Alert,
  Space,
} from "@mantine/core";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [notifications, setNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.put(
        "/api/user/settings",
        {
          email,
          notifications,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setUser(response.data);
      setSuccess("Settings updated successfully");
    } catch (error) {
      setError("Failed to update settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <Container size="xs"><Text>Please log in to view settings.</Text></Container>;
  }

  return (
    <Container size="xs">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          Settings
        </Title>
        <Text size="sm" color="dimmed" style={{ marginBottom: "1rem", textAlign: "center" }}>
          Manage your account settings and preferences
        </Text>
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: "1rem" }}
          />
          <div className="flex items-center space-x-2">
            <Switch
              label="Receive email notifications"
              checked={notifications}
              onChange={(event) => setNotifications(event.currentTarget.checked)}
            />
          </div>
          <Space h="md" />
          <Button type="submit" disabled={isLoading} fullWidth>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          {error && <Alert color="red" style={{ marginTop: "1rem" }}>{error}</Alert>}
          {success && <Alert color="green" style={{ marginTop: "1rem" }}>{success}</Alert>}
        </form>
      </Card>
    </Container>
  );
}

export default Settings;
