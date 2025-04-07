import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  LoadingOverlay,
  Modal,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconCheck, IconSchool, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface University {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  owner?: {
    username: string;
  };
}

interface Affiliation {
  id: string;
  userId: string;
  universityId: string;
  status: 'pending' | 'active' | 'rejected';
  university: University;
}

export default function MyUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [pendingAffiliations, setPendingAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [detailsOpened, detailsHandlers] = useDisclosure(false);
  const { api, refreshSession } = useAuth();

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get active affiliations
        await refreshSession();
        const activeResponse = await api.get('/university/my-affiliations');

        // Safely handle the response - check if it's an array
        if (Array.isArray(activeResponse.data)) {
          setUniversities(activeResponse.data.filter(Boolean)); // Filter out any null/undefined items
        } else {
          console.warn('Unexpected format for active affiliations:', activeResponse.data);
          setUniversities([]);
        }

        // Get pending affiliations
        try {
          // Changed to correct endpoint for pending affiliations
          const pendingResponse = await api.get('/university/pending-affiliations');
          if (Array.isArray(pendingResponse.data)) {
            setPendingAffiliations(pendingResponse.data.filter(Boolean));
          }
        } catch (pendingError) {
          console.log('No pending affiliations or endpoint not available');
          // This is not a critical error, so we don't set the main error state
        }
      } catch (err: any) {
        console.error('Failed to fetch universities:', err);
        setError(err.message || 'Failed to load your universities');
      } finally {
        setLoading(false);
      }
    };

    fetchUniversities();
  }, []);

  // Handle the response to a university affiliation request
  const handleAffiliationResponse = async (affiliationId: string, accept: boolean) => {
    try {
      setLoading(true);
      await refreshSession();
      await api.post('/university/respond-affiliation', {
        affiliationId,
        accept,
      });

      // Refresh the data
      setPendingAffiliations(prev => prev.filter(a => a.id !== affiliationId));

      // If accepted, add to active universities
      if (accept) {
        const affiliation = pendingAffiliations.find(a => a.id === affiliationId);
        if (affiliation && affiliation.university) {
          setUniversities(prev => [...prev, affiliation.university]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to respond to affiliation request');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (university: University) => {
    setSelectedUniversity(university);
    detailsHandlers.open();
  };

  const renderUniversityCard = (university: University) => {
    // Add null check to prevent errors
    if (!university) return null;

    return (
      <Grid.Col key={university.id} span={{ base: 12, md: 6, lg: 4 }}>
        <Card p="lg" radius="md" withBorder shadow="sm">
          <Group justify="space-between" mb="xs">
            <Group>
              <IconSchool size={24} color="var(--mantine-color-blue-6)" />
              <Title order={4}>{university.displayName || 'University Name Unavailable'}</Title>
            </Group>
          </Group>

          <Text size="sm" color="dimmed" mb="md">
            {university.description || 'No description available'}
          </Text>

          <Button variant="outline" fullWidth onClick={() => openDetails(university)}>
            View Details
          </Button>
        </Card>
      </Grid.Col>
    );
  };

  const renderPendingAffiliations = () => {
    if (!pendingAffiliations.length) return null;

    return (
      <Box mt="xl">
        <Title order={3} mb="md">
          Pending Affiliation Requests
        </Title>
        <Grid>
          {pendingAffiliations.map(affiliation => {
            // Add null check to prevent errors
            if (!affiliation || !affiliation.university) return null;

            return (
              <Grid.Col key={affiliation.id} span={{ base: 12, md: 6, lg: 4 }}>
                <Card p="lg" radius="md" withBorder shadow="sm">
                  <Group justify="apart" mb="xs">
                    <Group>
                      <IconSchool size={24} color="var(--mantine-color-gray-6)" />
                      <Title order={4}>
                        {affiliation.university.displayName || 'University Name Unavailable'}
                      </Title>
                    </Group>
                    <Badge color="yellow">Pending</Badge>
                  </Group>

                  <Text size="sm" color="dimmed" mb="md">
                    {affiliation.university.owner
                      ? `Request from ${affiliation.university.owner.username}`
                      : 'University has requested to add you'}
                  </Text>

                  <Group grow>
                    <Button
                      color="red"
                      variant="light"
                      leftSection={<IconX size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, false)}
                    >
                      Decline
                    </Button>
                    <Button
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, true)}
                    >
                      Accept
                    </Button>
                  </Group>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Container size="lg">
      <Title order={2} mb="xl">
        My Universities
      </Title>

      <Box style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">
            {error}
          </Alert>
        )}

        {!loading && !error && universities.length === 0 && !pendingAffiliations.length && (
          <Alert icon={<IconSchool size="1rem" />} title="No Universities" color="blue">
            You are not affiliated with any universities yet.
          </Alert>
        )}

        {universities.length > 0 && (
          <>
            <Title order={3} mb="md">
              Active Affiliations
            </Title>
            <Grid>{universities.map(university => renderUniversityCard(university))}</Grid>
          </>
        )}

        {renderPendingAffiliations()}
      </Box>

      {/* University Details Modal */}
      <Modal
        opened={detailsOpened}
        onClose={detailsHandlers.close}
        title={selectedUniversity?.displayName || 'University Details'}
        size="lg"
      >
        {selectedUniversity && (
          <>
            <Group mb="md">
              <IconSchool size={24} color="var(--mantine-color-blue-6)" />
              <Title order={3}>{selectedUniversity.displayName}</Title>
            </Group>

            {selectedUniversity.description && (
              <Text mb="lg">{selectedUniversity.description}</Text>
            )}

            <Table mb="md">
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>
                    <strong>University ID</strong>
                  </Table.Td>
                  <Table.Td>{selectedUniversity.id}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>
                    <strong>Identifier</strong>
                  </Table.Td>
                  <Table.Td>{selectedUniversity.name}</Table.Td>
                </Table.Tr>
                {selectedUniversity.owner && (
                  <Table.Tr>
                    <Table.Td>
                      <strong>Managed By</strong>
                    </Table.Td>
                    <Table.Td>{selectedUniversity.owner.username}</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            <Text size="sm" color="dimmed" mb="md">
              You are currently affiliated with this university and can receive degrees from them.
            </Text>
          </>
        )}
      </Modal>
    </Container>
  );
}
