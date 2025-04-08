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
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconClockHour4,
  IconPlus,
  IconSchool,
  IconX,
} from '@tabler/icons-react';
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
  initiatedBy?: 'student' | 'university'; // Add this field to track who initiated
  university: University;
}

export default function MyUniversities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [pendingAffiliations, setPendingAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [detailsOpened, detailsHandlers] = useDisclosure(false);
  const [joinModalOpened, joinModalHandlers] = useDisclosure(false);
  const [availableUniversities, setAvailableUniversities] = useState<University[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [joinRequestLoading, setJoinRequestLoading] = useState(false);
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

  // Add function to fetch available universities for join modal
  const fetchAvailableUniversities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/universities');

      // Filter out universities the user is already affiliated with or has pending requests to
      const alreadyAffiliatedIds = new Set([
        ...universities.map(uni => uni.id),
        ...pendingAffiliations.map(aff => aff.universityId),
      ]);

      const filteredUniversities = response.data.filter(
        (uni: University) => !alreadyAffiliatedIds.has(uni.id),
      );

      setAvailableUniversities(filteredUniversities);
    } catch (err: any) {
      console.error('Failed to fetch universities:', err);
      setError('Failed to load available universities');
    } finally {
      setLoading(false);
    }
  };

  // Open join modal and fetch available universities
  const openJoinModal = () => {
    fetchAvailableUniversities();
    modals.open({
      title: 'Request to Join University',
      size: 'md',
      children: (
        <Stack>
          <Text size="sm" mb="md">
            Select a university to request affiliation with. Your request will need to be approved
            by the university administrator.
          </Text>

          <Select
            label="Select University"
            placeholder="Choose a university"
            data={availableUniversities.map(uni => ({
              value: uni.id,
              label: `${uni.displayName} (by ${uni.owner?.username || 'Unknown'})`,
            }))}
            value={selectedUniversityId}
            onChange={setSelectedUniversityId}
            searchable
            nothingFoundMessage="No universities found"
            mb="xl"
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => modals.closeAll()}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinRequest}
              loading={joinRequestLoading}
              disabled={!selectedUniversityId}
            >
              Submit Request
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  // Handle join request submission
  const handleJoinRequest = async () => {
    if (!selectedUniversityId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a university',
        color: 'red',
      });
      return;
    }

    try {
      setJoinRequestLoading(true);
      setError(null);

      await refreshSession();
      await api.post('/university/request-join', {
        universityId: selectedUniversityId,
      });

      notifications.show({
        title: 'Success',
        message: 'Join request submitted successfully. Waiting for approval.',
        color: 'green',
      });

      // Refresh pending affiliations to show the new request
      const pendingResponse = await api.get('/university/pending-affiliations');
      if (Array.isArray(pendingResponse.data)) {
        setPendingAffiliations(pendingResponse.data.filter(Boolean));
      }

      modals.closeAll();
      setSelectedUniversityId(null);
    } catch (err: any) {
      console.error('Failed to send join request:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to send join request',
        color: 'red',
      });
    } finally {
      setJoinRequestLoading(false);
    }
  };

  const openDetailsModal = (university: University) => {
    modals.open({
      title: university.displayName,
      size: 'lg',
      children: (
        <Stack>
          <Text size="sm" c="dimmed">
            Description
          </Text>
          <Text>{university.description || 'No description available.'}</Text>

          <Text size="sm" c="dimmed" mt="md">
            Administrator
          </Text>
          <Text>{university.owner?.username || 'Unknown'}</Text>
        </Stack>
      ),
    });
  };

  // Add a function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Add a function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <IconCheck size={16} />;
      case 'pending':
        return <IconClockHour4 size={16} />;
      case 'rejected':
        return <IconX size={16} />;
      default:
        return null;
    }
  };

  const renderUniversityCard = (university: University) => (
    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={university.id}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section bg="gray.1" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text fw={500} size="lg" mb={5}>
                {university.displayName}
              </Text>
              <Badge color="blue" variant="light">
                Active Member
              </Badge>
            </Box>
            <IconSchool size={24} color="var(--mantine-color-blue-6)" />
          </Group>
        </Card.Section>

        <Text mt="md" size="sm" c="dimmed" lineClamp={2}>
          {university.description || 'No description available.'}
        </Text>

        <Button
          variant="light"
          color="blue"
          fullWidth
          mt="md"
          radius="md"
          onClick={() => openDetailsModal(university)}
        >
          View Details
        </Button>
      </Card>
    </Grid.Col>
  );

  const renderPendingAffiliations = () => {
    if (!pendingAffiliations.length) return null;

    return (
      <>
        <Title order={3} mt="xl" mb="md">
          Pending Affiliations
        </Title>
        <Grid>
          {pendingAffiliations.map(affiliation => (
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={affiliation.id}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section bg="gray.1" p="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={500} size="lg" mb={5}>
                        {affiliation.university.displayName}
                      </Text>
                      <Badge
                        color={getStatusColor(affiliation.status)}
                        variant="light"
                        leftSection={getStatusIcon(affiliation.status)}
                      >
                        {affiliation.status.charAt(0).toUpperCase() + affiliation.status.slice(1)}
                      </Badge>
                    </Box>
                    <IconSchool size={24} color="var(--mantine-color-yellow-6)" />
                  </Group>
                </Card.Section>

                <Text mt="md" size="sm" c="dimmed" lineClamp={2}>
                  {affiliation.university.description || 'No description available.'}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </>
    );
  };

  return (
    <Container size="lg">
      <Group justify="space-between" align="center" mb="xl">
        <Title order={2}>My Universities</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openJoinModal}
          variant="light"
          color="blue"
        >
          Request to Join University
        </Button>
      </Group>

      <Box style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size="1rem" />} title="Success" color="green" mb="md">
            {success}
          </Alert>
        )}

        {!loading && !error && universities.length === 0 && !pendingAffiliations.length && (
          <Alert icon={<IconSchool size="1rem" />} title="No Universities" color="blue">
            You are not affiliated with any universities yet. Use the button above to request to
            join a university.
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
    </Container>
  );
}
