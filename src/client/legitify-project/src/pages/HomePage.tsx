import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCertificate, IconCheck, IconFileText } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  const renderActionButtons = () => {
    if (!user) {
      return (
        <Group mt="xl">
          <Button
            component={Link}
            to="/register"
            size="xl"
            variant="white"
            color="blue"
          >
            Get Started
          </Button>
          <Button
            component={Link}
            to="/login"
            size="xl"
            variant="outline"
            color="white"
          >
            Login
          </Button>
        </Group>
      );
    }

    switch (user.role) {
      case "university":
        return (
          <Button
            component={Link}
            to="/degree/issue"
            size="xl"
            variant="white"
            color="blue"
          >
            Issue New Degree
          </Button>
        );
      case "individual":
        return (
          <Group mt="xl">
            <Button
              component={Link}
              to="/degree/manage"
              size="xl"
              variant="white"
              color="blue"
            >
              Manage Degrees
            </Button>
            <Button
              component={Link}
              to="/degree/requests"
              size="xl"
              variant="outline"
              color="white"
            >
              View Access Requests
            </Button>
          </Group>
        );
      case "employer":
        return (
          <Button
            component={Link}
            to="/degree/verify"
            size="xl"
            variant="white"
            color="blue"
          >
            Verify Degrees
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Paper
        p="xl"
        style={{
          background: "linear-gradient(45deg, #228be6 0%, #40c057 100%)",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container size="lg">
          <Stack gap="xl" style={{ color: "white" }}>
            <Title
              order={1}
              style={{
                fontSize: "3.5rem",
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: "2rem",
              }}
            >
              {user ? `Welcome, ${user.orgName}` : "Secure Degree Verification"}
              <Text
                component="span"
                inherit
                variant="gradient"
                gradient={{ from: "yellow", to: "white" }}
              >
                {" "}
                Using Blockchain
              </Text>
            </Title>
            <Text size="xl" style={{ maxWidth: "600px" }}>
              {user
                ? `You are logged in as a ${user.role}`
                : "Transform the way academic credentials are issued, shared, and verified with our cutting-edge blockchain solution."}
            </Text>
            {renderActionButtons()}
          </Stack>
        </Container>
      </Paper>

      <Container size="lg" mt={80}>
        <Grid gutter={50}>
          <Grid.Col span={4}>
            <Card shadow="sm" p="xl" radius="md" withBorder>
              <ThemeIcon
                size={60}
                radius="md"
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                <IconCertificate size={30} />
              </ThemeIcon>
              <Title order={3} mt="md">
                Issue Degrees
              </Title>
              <Text size="sm" mt="sm" color="dimmed">
                Universities can securely issue digital degrees that are
                tamper-proof and easily verifiable on the blockchain.
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={4}>
            <Card shadow="sm" p="xl" radius="md" withBorder>
              <ThemeIcon
                size={60}
                radius="md"
                variant="gradient"
                gradient={{ from: "teal", to: "lime" }}
              >
                <IconFileText size={30} />
              </ThemeIcon>
              <Title order={3} mt="md">
                Request Access
              </Title>
              <Text size="sm" mt="sm" color="dimmed">
                Graduates can securely access and share their digital degrees
                with potential employers through our platform.
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={4}>
            <Card shadow="sm" p="xl" radius="md" withBorder>
              <ThemeIcon
                size={60}
                radius="md"
                variant="gradient"
                gradient={{ from: "orange", to: "red" }}
              >
                <IconCheck size={30} />
              </ThemeIcon>
              <Title order={3} mt="md">
                Verify Degrees
              </Title>
              <Text size="sm" mt="sm" color="dimmed">
                Employers can instantly verify the authenticity of degrees using
                our blockchain-based verification system.
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
