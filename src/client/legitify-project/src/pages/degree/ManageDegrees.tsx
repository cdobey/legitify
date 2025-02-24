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
import { DegreeDocument } from "../../api/degrees/degree.models";
import {
  useAcceptDegree,
  useDenyDegree,
  useMyDegrees,
} from "../../api/degrees/degree.queries";

export default function ManageDegrees() {
  const { data: degrees, isLoading, error, refetch } = useMyDegrees();
  const acceptMutation = useAcceptDegree();
  const denyMutation = useDenyDegree();

  const handleAccept = async (docId: string) => {
    await acceptMutation.mutateAsync(docId);
    refetch();
  };

  const handleDeny = async (docId: string) => {
    await denyMutation.mutateAsync(docId);
    refetch();
  };

  if (isLoading) return <Text>Loading...</Text>;

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Manage Degrees
      </Title>

      {error && (
        <Alert color="red" mb="lg">
          {(error as Error).message}
        </Alert>
      )}

      {!degrees?.length ? (
        <Text c="dimmed" ta="center">
          No degrees available
        </Text>
      ) : (
        <Stack>
          {degrees.map((degree: DegreeDocument) => (
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
