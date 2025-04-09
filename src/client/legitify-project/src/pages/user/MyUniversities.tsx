import { University } from '@/api/universities/university.models';
import {
  useJoinUniversityMutation,
  useRespondToAffiliationMutation,
} from '@/api/universities/university.mutations';
import {
  useAllUniversitiesQuery,
  usePendingAffiliationsQuery,
  useStudentUniversitiesQuery,
} from '@/api/universities/university.queries';
import { useAuth } from '@/contexts/AuthContext';
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
import { useState } from 'react';

export default function MyUniversities() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [detailsOpened, detailsHandlers] = useDisclosure(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const { refreshSession } = useAuth();

  // Replace direct API calls with React Query hooks
  const { data: universities = [], isLoading: isLoadingUniversities } =
    useStudentUniversitiesQuery();

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery();

  const joinUniversityMutation = useJoinUniversityMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();

  const openJoinModal = () => {
    modals.open({
      title: 'Request to Join University',
      size: 'md',
      children: (
        <JoinUniversityModalContent
          onSubmit={handleJoinRequest}
          onCancel={() => modals.closeAll()}
        />
      ),
    });
  };

  const JoinUniversityModalContent = ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: () => void;
    onCancel: () => void;
  }) => {
    const { data: availableUniversities = [], isLoading: isLoadingAll } = useAllUniversitiesQuery();

    // Filter out universities the user is already affiliated with
    const filteredUniversities = availableUniversities.filter(uni => {
      const alreadyAffiliatedIds = new Set([
        ...universities.map(u => u.id),
        ...pendingAffiliations.map(aff => aff.universityId),
      ]);
      return !alreadyAffiliatedIds.has(uni.id);
    });

    return (
      <Stack>
        <Text size="sm" mb="md">
          Select a university to request affiliation with. Your request will need to be approved by
          the university administrator.
        </Text>

        <Select
          label="Select University"
          placeholder={isLoadingAll ? 'Loading universities...' : 'Choose a university'}
          data={filteredUniversities.map(uni => ({
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
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={joinUniversityMutation.isPending}
            disabled={!selectedUniversityId}
          >
            Submit Request
          </Button>
        </Group>
      </Stack>
    );
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
      await refreshSession();
      await joinUniversityMutation.mutateAsync({
        universityId: selectedUniversityId,
      });

      notifications.show({
        title: 'Success',
        message: 'Join request submitted successfully. Waiting for approval.',
        color: 'green',
      });

      modals.closeAll();
      setSelectedUniversityId(null);
    } catch (err: any) {
      console.error('Failed to send join request:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to send join request',
        color: 'red',
      });
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

  const isLoading =
    isLoadingUniversities ||
    isLoadingPendingAffiliations ||
    joinUniversityMutation.isPending ||
    respondToAffiliationMutation.isPending;

  return (
    <Container size="lg">
      <Group justify="space-between" align="center" mb="xl">
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
        <LoadingOverlay visible={isLoading} />

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

        {!isLoading && !error && universities.length === 0 && !pendingAffiliations.length && (
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
