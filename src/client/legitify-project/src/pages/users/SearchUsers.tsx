import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconUserCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useRequestAccess, useSearchUser, useUserDegrees } from '../../api/degrees/degree.queries';

export default function SearchUsers() {
  const [email, setEmail] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  const searchMutation = useSearchUser();
  const requestAccessMutation = useRequestAccess();

  // Only fetch degrees if we have a user
  const {
    data: degrees,
    isLoading: degreesLoading,
    error: degreesError,
  } = useUserDegrees(searchMutation.data?.uid || '', {
    enabled: !!searchMutation.data?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSearchPerformed(true);
    searchMutation.mutate(email);
  };

  const handleRequestAccess = async (docId: string) => {
    try {
      await requestAccessMutation.mutateAsync(docId);
    } catch (error) {
      console.error('Error requesting access:', error);
    }
  };

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Search Users
      </Title>

      <Paper p="md" withBorder mb="xl">
        <form onSubmit={handleSearch}>
          <TextInput
            label="Search by Email"
            placeholder="Enter user email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            rightSection={
              searchMutation.isPending ? <Loader size="xs" /> : <IconSearch size={16} />
            }
            required
            mb="md"
          />

          <Button type="submit" loading={searchMutation.isPending}>
            Search
          </Button>
        </form>
      </Paper>

      {searchMutation.isError && (
        <Alert color="red" mb="lg">
          {searchMutation.error.message || 'Error searching for user'}
        </Alert>
      )}

      {searchPerformed &&
        !searchMutation.isPending &&
        !searchMutation.data &&
        !searchMutation.isError && (
          <Alert color="yellow" mb="lg">
            No user found with that email address.
          </Alert>
        )}

      {searchMutation.data && (
        <Paper p="md" withBorder mb="xl">
          <Group align="center" mb="md">
            <IconUserCheck size={24} />
            <div>
              <Text fw={500}>{searchMutation.data.username}</Text>
              <Text size="sm" c="dimmed">
                {searchMutation.data.email}
              </Text>
            </div>
          </Group>

          <Divider my="md" />

          <Text fw={500} mb="sm">
            User's Documents
          </Text>

          {degreesLoading && <Loader size="sm" />}

          {degreesError && (
            <Alert color="red" mb="lg">
              Error loading user's documents
            </Alert>
          )}

          {degrees && degrees.length === 0 && (
            <Text c="dimmed" size="sm">
              This user has no accessible documents.
            </Text>
          )}

          <Stack mt="md">
            {degrees &&
              degrees.map(doc => (
                <Card key={doc.docId} shadow="xs" p="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>Document ID: {doc.docId.substring(0, 12)}...</Text>
                    <Badge color="green">Verified</Badge>
                  </Group>

                  <Text size="sm" c="dimmed" mb="md">
                    Issued by: {doc.issuer}
                  </Text>

                  <Text size="sm" mb="md">
                    Issue date: {new Date(doc.issueDate).toLocaleDateString()}
                  </Text>

                  <Button
                    onClick={() => handleRequestAccess(doc.docId)}
                    loading={requestAccessMutation.isPending}
                    fullWidth
                    variant="light"
                    color="blue"
                  >
                    Request Access
                  </Button>

                  {requestAccessMutation.isSuccess &&
                    requestAccessMutation.variables === doc.docId && (
                      <Text size="sm" c="green" mt="xs" ta="center">
                        Access requested successfully!
                      </Text>
                    )}
                </Card>
              ))}
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
