import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  acceptDegree,
  denyDegree,
  getMyDegrees,
} from "../../services/degreeService";

interface Degree {
  docId: string;
  issuer: string;
  status: string;
  issueDate: string;
}

export default function ManageDegrees() {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDegrees = async () => {
    try {
      setLoading(true);
      const data = await getMyDegrees();
      setDegrees(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to fetch degrees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDegrees();
  }, []);

  const handleAccept = async (docId: string) => {
    try {
      await acceptDegree(docId);
      await fetchDegrees(); // Refresh the list
    } catch (err: any) {
      setError(err.message || "Failed to accept degree");
    }
  };

  const handleDeny = async (docId: string) => {
    try {
      await denyDegree(docId);
      await fetchDegrees(); // Refresh the list
    } catch (err: any) {
      setError(err.message || "Failed to deny degree");
    }
  };

  if (loading) {
    return (
      <Container size="md" style={{ textAlign: "center", padding: "2rem" }}>
        <Loader />
      </Container>
    );
  }

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Manage Degrees
      </Title>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      {degrees.length === 0 ? (
        <Text c="dimmed" ta="center">
          No degrees available
        </Text>
      ) : (
        <Stack>
          {degrees.map((degree) => (
            <Card key={degree.docId} shadow="sm" p="lg">
              <Text fw={500} mb="xs">
                Degree ID: {degree.docId}
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Issued by: {degree.issuer}
              </Text>
              <Text size="sm" mb="md">
                Status: {degree.status}
              </Text>
              <Text size="sm" mb="md">
                Issue Date: {new Date(degree.issueDate).toLocaleDateString()}
              </Text>

              {degree.status === "issued" && (
                <Group mt="md">
                  <Button
                    onClick={() => handleAccept(degree.docId)}
                    color="green"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleDeny(degree.docId)}
                    color="red"
                    variant="light"
                  >
                    Deny
                  </Button>
                </Group>
              )}
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
