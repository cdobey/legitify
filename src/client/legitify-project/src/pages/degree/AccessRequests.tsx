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
import { getAccessRequests, grantAccess } from "../../services/degreeService";

export default function AccessRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getAccessRequests();
      setRequests(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to fetch access requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleGrantAccess = async (requestId: string, granted: boolean) => {
    try {
      await grantAccess(requestId, granted);
      // Refresh the requests list after granting/denying access
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || "Failed to update access request");
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
        Access Requests
      </Title>

      {error && (
        <Alert color="red" mb="lg">
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Text c="dimmed" ta="center">
          No pending access requests
        </Text>
      ) : (
        <Stack>
          {requests.map((request) => (
            <Card key={request.requestId} shadow="sm" p="lg">
              <Text fw={500} mb="xs">
                Request from {request.employerName}
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Document: {request.docId}
              </Text>
              <Text size="sm" mb="md">
                Requested on:{" "}
                {new Date(request.requestDate).toLocaleDateString()}
              </Text>
              <Group mt="md">
                <Button
                  onClick={() => handleGrantAccess(request.requestId, true)}
                  color="green"
                >
                  Grant Access
                </Button>
                <Button
                  onClick={() => handleGrantAccess(request.requestId, false)}
                  color="red"
                  variant="light"
                >
                  Deny Access
                </Button>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
