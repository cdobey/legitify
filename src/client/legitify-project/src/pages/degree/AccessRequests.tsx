import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { AccessRequest } from "../../api/degrees/degree.models";
import {
  useAccessRequests,
  useGrantAccess,
} from "../../api/degrees/degree.queries";

export default function AccessRequests() {
  const { data: requests, isLoading, error, refetch } = useAccessRequests();
  const grantMutation = useGrantAccess();

  const handleGrantAccess = async (requestId: string, granted: boolean) => {
    await grantMutation.mutateAsync({ requestId, granted });
    refetch();
  };

  if (isLoading) {
    return (
      <Container size="md" style={{ textAlign: "center", padding: "2rem" }}>
        <Text>Loading...</Text>
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
          {(error as Error).message}
        </Alert>
      )}

      {!requests?.length ? (
        <Text c="dimmed" ta="center">
          No pending access requests
        </Text>
      ) : (
        <Stack>
          {requests.map((request: AccessRequest) => (
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
                  loading={grantMutation.isPending}
                  color="green"
                >
                  Grant Access
                </Button>
                <Button
                  onClick={() => handleGrantAccess(request.requestId, false)}
                  loading={grantMutation.isPending}
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
