import { useAccessibleDegreesQuery } from '@/api/degrees/degree.queries';
import { Alert, Badge, Button, Card, Container, Group, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

export default function AccessibleDegrees() {
  const { data: degrees, isLoading, error, refetch } = useAccessibleDegreesQuery();

  if (isLoading) {
    return (
      <Container size="md" style={{ textAlign: 'center', padding: '2rem' }}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  return (
    <Container size="md">
      {error && (
        <Alert color="red" mb="lg">
          {(error as Error).message}
        </Alert>
      )}

      {!degrees?.length ? (
        <Alert color="gray" mb="xl">
          You don't have access to any degrees yet. You can search for individuals and request
          access to their degrees from the Verify Degrees page.
        </Alert>
      ) : (
        <Stack>
          {degrees.map(degree => (
            <Card key={degree.docId} shadow="sm" p="lg" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={500}>Document ID: {degree.docId}</Text>
                <Badge color={degree.status === 'accepted' ? 'green' : 'blue'}>
                  {degree.status}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Issued by: {degree.issuer}
              </Text>
              <Text size="sm" mb="md">
                Owner: {degree.owner.name} ({degree.owner.email})
              </Text>
              <Text size="sm" c="dimmed" mb="xl">
                Access granted on: {new Date(degree.dateGranted).toLocaleDateString()}
              </Text>
              <Button component={Link} to={`/degree/view/${degree.docId}`} fullWidth>
                View Document
              </Button>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
