import { University } from '@/api/universities/university.models';
import {
  useRespondToAffiliationMutation,
  useStudentJoinUniversityMutation,
} from '@/api/universities/university.mutations';
import {
  useAllUniversitiesQuery,
  usePendingAffiliationsQuery,
  useStudentUniversitiesQuery,
} from '@/api/universities/university.queries';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBuildingCommunity,
  IconCalendar,
  IconCheck,
  IconClockHour4,
  IconInfoCircle,
  IconPlus,
  IconSchool,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function MyUniversities() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('active');

  const { data: universities = [], isLoading: isLoadingUniversities } =
    useStudentUniversitiesQuery();

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery();

  const studentJoinMutation = useStudentJoinUniversityMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();

  const openJoinModal = () => {
    modals.open({
      title: 'Request to Join University',
      size: 'md',
      zIndex: 200,
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
    onSubmit: (universityId: string) => void;
    onCancel: () => void;
  }) => {
    const { data: availableUniversities = [], isLoading: isLoadingAll } = useAllUniversitiesQuery();
    const [localSelectedUniversityId, setLocalSelectedUniversityId] = useState<string | null>(null);

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
          value={localSelectedUniversityId}
          onChange={setLocalSelectedUniversityId}
          nothingFoundMessage="No universities found"
          mb="xl"
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => localSelectedUniversityId && onSubmit(localSelectedUniversityId)}
            loading={studentJoinMutation.isPending}
            disabled={!localSelectedUniversityId}
          >
            Submit Request
          </Button>
        </Group>
      </Stack>
    );
  };

  const handleJoinRequest = async (universityId: string) => {
    if (!universityId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a university',
        color: 'red',
      });
      return;
    }

    try {
      await refreshSession();
      await studentJoinMutation.mutateAsync({
        universityId,
      });

      notifications.show({
        title: 'Success',
        message: 'Join request submitted successfully. Waiting for approval.',
        color: 'green',
      });

      modals.closeAll();
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
      title: '',
      size: 'lg',
      styles: {
        header: {
          display: 'none',
        },
        body: {
          padding: 0,
        },
        content: {
          borderRadius: 'var(--mantine-radius-md)',
        },
      },
      children: (
        <Box>
          {/* Header section with background color */}
          <Box
            p="lg"
            bg="blue.6"
            style={{
              color: 'white',
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Group justify="space-between">
              <Flex gap="md" align="center">
                {university.logoUrl ? (
                  <Avatar src={university.logoUrl} size={50} radius="md" bg="white" />
                ) : (
                  <ThemeIcon size={50} radius="md" variant="filled" color="blue.3">
                    <IconSchool size={30} color="white" />
                  </ThemeIcon>
                )}
                <Box>
                  <Text size="xl" fw={700} c="white">
                    {university.displayName}
                  </Text>
                  <Badge
                    color="blue.2"
                    size="sm"
                    variant="filled"
                    leftSection={<IconCheck size={14} />}
                  >
                    Active Member
                  </Badge>
                </Box>
              </Flex>
              <ActionIcon
                variant="transparent"
                c="white"
                onClick={() => modals.closeAll()}
                size="lg"
              >
                <IconX size={20} />
              </ActionIcon>
            </Group>
          </Box>

          {/* Main content area */}
          <Box p="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              {/* University details card */}
              <Paper withBorder p="md" radius="md">
                <Group mb="xs">
                  <ThemeIcon color="blue" variant="light" size="md">
                    <IconInfoCircle size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    University Details
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Box>
                    <Text size="xs" c="dimmed">
                      ID:
                    </Text>
                    <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                      {university.id}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Name:
                    </Text>
                    <Text size="sm">{university.name}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Admin:
                    </Text>
                    <Text size="sm">{university.owner?.username || 'Unknown'}</Text>
                  </Box>
                </Stack>
              </Paper>

              {/* Affiliation information card */}
              <Paper withBorder p="md" radius="md">
                <Group mb="xs">
                  <ThemeIcon color="green" variant="light" size="md">
                    <IconCheck size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    Affiliation Status
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Box>
                    <Text size="xs" c="dimmed">
                      Status:
                    </Text>
                    <Badge color="green" leftSection={<IconCheck size={12} />}>
                      Active
                    </Badge>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Since:
                    </Text>
                    <Text size="sm">{new Date().toLocaleDateString()}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Initiated by:
                    </Text>
                    <Text size="sm">You</Text>
                  </Box>
                </Stack>
              </Paper>
            </SimpleGrid>

            {/* About section */}
            <Paper withBorder p="md" radius="md">
              <Group mb="xs">
                <ThemeIcon color="blue" variant="light" size="md">
                  <IconBuildingCommunity size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  About this University
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {university.description || 'No description provided for this university.'}
              </Text>
            </Paper>
          </Box>
        </Box>
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
      <Paper shadow="xs" p={0} radius="md" withBorder>
        <Flex direction="column" h="100%">
          <Box
            bg="blue.6"
            p="md"
            style={{
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Flex gap="md" align="center">
              {university.logoUrl ? (
                <Avatar src={university.logoUrl} size={64} radius="md" bg="white" />
              ) : (
                <ThemeIcon size={64} radius="md" variant="filled" color="blue.3">
                  <IconSchool size={40} color="white" />
                </ThemeIcon>
              )}
              <Box>
                <Text fw={700} size="lg" c="white" lh={1.3}>
                  {university.displayName}
                </Text>
                <Badge variant="filled" size="sm" color="blue.8">
                  Active Member
                </Badge>
              </Box>
            </Flex>
          </Box>

          <Stack p="md" style={{ flex: 1 }}>
            <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
              {university.description || 'No description available.'}
            </Text>

            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Admin: {university.owner?.username || 'Unknown admin'}
              </Text>
            </Group>
          </Stack>

          <Box p="md" pt={0}>
            <Button
              fullWidth
              variant="light"
              onClick={() => openDetailsModal(university)}
              rightSection={<IconInfoCircle size={16} />}
            >
              View Details
            </Button>
          </Box>
        </Flex>
      </Paper>
    </Grid.Col>
  );

  const renderPendingAffiliationCard = (affiliation: any) => (
    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={affiliation.id}>
      <Paper shadow="xs" p={0} radius="md" withBorder>
        <Flex direction="column" h="100%">
          <Box
            bg="yellow.6"
            p="md"
            style={{
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Flex gap="md" align="center">
              {affiliation.university.logoUrl ? (
                <Avatar src={affiliation.university.logoUrl} size={64} radius="md" bg="white" />
              ) : (
                <ThemeIcon size={64} radius="md" variant="filled" color="yellow.3">
                  <IconSchool size={40} color="white" />
                </ThemeIcon>
              )}
              <Box>
                <Text fw={700} size="lg" c="white" lh={1.3}>
                  {affiliation.university.displayName}
                </Text>
                <Badge
                  variant="filled"
                  size="sm"
                  color="yellow.8"
                  leftSection={getStatusIcon(affiliation.status)}
                >
                  {affiliation.status.charAt(0).toUpperCase() + affiliation.status.slice(1)}
                </Badge>
              </Box>
            </Flex>
          </Box>

          <Stack p="md" style={{ flex: 1 }}>
            <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
              {affiliation.university.description || 'No description available.'}
            </Text>

            <Group gap="xs">
              <IconCalendar size={16} stroke={1.5} />
              <Text size="sm" c="dimmed">
                Request Date: {new Date(affiliation.createdAt).toLocaleDateString()}
              </Text>
            </Group>
          </Stack>

          {affiliation.initiatedBy === 'university' && (
            <Box p="md" pt={0}>
              <Group gap="xs" grow>
                <Button
                  variant="light"
                  color="green"
                  radius="md"
                  leftSection={<IconCheck size={16} />}
                  onClick={async () => {
                    try {
                      await refreshSession();
                      await respondToAffiliationMutation.mutateAsync({
                        affiliationId: affiliation.id,
                        accept: true,
                      });
                      notifications.show({
                        title: 'Success',
                        message: 'Invitation accepted successfully.',
                        color: 'green',
                      });
                    } catch (err: any) {
                      notifications.show({
                        title: 'Error',
                        message: err.message || 'Failed to accept invitation',
                        color: 'red',
                      });
                    }
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="light"
                  color="red"
                  radius="md"
                  leftSection={<IconX size={16} />}
                  onClick={async () => {
                    try {
                      await refreshSession();
                      await respondToAffiliationMutation.mutateAsync({
                        affiliationId: affiliation.id,
                        accept: false,
                      });
                      notifications.show({
                        title: 'Success',
                        message: 'Invitation rejected.',
                        color: 'gray',
                      });
                    } catch (err: any) {
                      notifications.show({
                        title: 'Error',
                        message: err.message || 'Failed to reject invitation',
                        color: 'red',
                      });
                    }
                  }}
                >
                  Reject
                </Button>
              </Group>
            </Box>
          )}

          {affiliation.initiatedBy === 'student' && (
            <Box p="md" pt={0}>
              <Button
                fullWidth
                variant="light"
                color="yellow"
                disabled
                leftSection={<IconClockHour4 size={16} />}
              >
                Awaiting Response
              </Button>
            </Box>
          )}
        </Flex>
      </Paper>
    </Grid.Col>
  );

  const isLoading =
    isLoadingUniversities ||
    isLoadingPendingAffiliations ||
    studentJoinMutation.isPending ||
    respondToAffiliationMutation.isPending;

  const noUniversitiesMessage = (
    <Alert
      icon={<IconBuildingCommunity size={24} />}
      title="No university affiliations"
      color="blue"
      radius="md"
      variant="light"
    >
      <Text>
        You are not affiliated with any universities yet. Use the button above to request to join a
        university.
      </Text>
      <Button
        onClick={openJoinModal}
        leftSection={<IconPlus size={16} />}
        mt="md"
        size="sm"
        variant="light"
      >
        Join a University
      </Button>
    </Alert>
  );

  const noPendingRequestsMessage = (
    <Alert
      icon={<IconClockHour4 size={24} />}
      title="No pending requests"
      color="gray"
      radius="md"
      variant="light"
    >
      <Text>You don't have any pending university affiliation requests.</Text>
      <Button
        onClick={openJoinModal}
        leftSection={<IconPlus size={16} />}
        mt="md"
        size="sm"
        variant="light"
      >
        Join a University
      </Button>
    </Alert>
  );

  return (
    <Container size="xl">
      <Box mb="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>My Universities</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openJoinModal}
            variant="filled"
            radius="md"
          >
            Join University
          </Button>
        </Group>
        <Text c="dimmed" size="sm" mt={4}>
          Manage your university affiliations and view pending requests
        </Text>
      </Box>

      <Box style={{ position: 'relative' }}>
        <LoadingOverlay visible={isLoading} />

        {error && (
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Error"
            color="red"
            mb="xl"
            radius="md"
            variant="filled"
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            icon={<IconCheck size="1rem" />}
            title="Success"
            color="green"
            mb="xl"
            radius="md"
            variant="filled"
          >
            {success}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
          <Tabs.List>
            <Tabs.Tab
              value="active"
              leftSection={<IconSchool size={16} />}
              rightSection={
                universities.length > 0 ? (
                  <Badge size="xs" variant="filled" color="blue">
                    {universities.length}
                  </Badge>
                ) : null
              }
            >
              Active Affiliations
            </Tabs.Tab>
            <Tabs.Tab
              value="pending"
              leftSection={<IconClockHour4 size={16} />}
              rightSection={
                pendingAffiliations.length > 0 ? (
                  <Badge size="xs" variant="filled" color="yellow">
                    {pendingAffiliations.length}
                  </Badge>
                ) : null
              }
            >
              Pending Requests
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="active" pt="md">
            {!isLoading && universities.length === 0 ? (
              noUniversitiesMessage
            ) : (
              <Grid gutter="md">
                {universities.map(university => renderUniversityCard(university))}
              </Grid>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="pending" pt="md">
            {!isLoading && pendingAffiliations.length === 0 ? (
              noPendingRequestsMessage
            ) : (
              <Grid gutter="md">
                {pendingAffiliations.map(affiliation => renderPendingAffiliationCard(affiliation))}
              </Grid>
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Container>
  );
}
