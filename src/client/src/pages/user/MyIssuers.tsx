import { Issuer } from '@/api/issuers/issuer.models';
import {
  useHolderJoinIssuerMutation,
  useRespondToAffiliationMutation,
} from '@/api/issuers/issuer.mutations';
import {
  useAllIssuersQuery,
  useHolderIssuersQuery,
  usePendingAffiliationsQuery,
} from '@/api/issuers/issuer.queries';
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

export default function MyIssuers() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('active');

  const { data: issuers = [], isLoading: isLoadingIssuers } = useHolderIssuersQuery();

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery();

  const holderJoinMutation = useHolderJoinIssuerMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();

  // Function to generate a consistent color for each issuer based on its ID
  const getIssuerColor = (issuerId: string) => {
    // Array of Mantine color options to choose from
    const colors = ['blue', 'cyan', 'grape', 'green', 'indigo', 'orange', 'pink', 'teal', 'violet'];

    // Simple hash function to create a consistent index from the issuer ID
    let hash = 0;
    for (let i = 0; i < issuerId.length; i++) {
      hash = (hash + issuerId.charCodeAt(i)) % colors.length;
    }

    return colors[hash];
  };

  const openJoinModal = () => {
    modals.open({
      title: 'Request to Join Issuer',
      size: 'md',
      zIndex: 200,
      children: (
        <JoinIssuerModalContent onSubmit={handleJoinRequest} onCancel={() => modals.closeAll()} />
      ),
    });
  };

  const JoinIssuerModalContent = ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (issuerId: string) => void;
    onCancel: () => void;
  }) => {
    const { data: availableIssuers = [], isLoading: isLoadingAll } = useAllIssuersQuery();
    const [localSelectedIssuerId, setLocalSelectedIssuerId] = useState<string | null>(null);

    // Filter out issuers the user is already affiliated with
    const filteredIssuers = availableIssuers.filter(issuer => {
      const alreadyAffiliatedIds = new Set([
        ...issuers.map(u => u.id),
        ...pendingAffiliations.map(aff => aff.issuerId),
      ]);
      return !alreadyAffiliatedIds.has(issuer.id);
    });

    return (
      <Stack>
        <Text size="sm" mb="md">
          Select an issuer to request affiliation with. Your request will need to be approved by the
          issuer administrator.
        </Text>

        <Select
          label="Select Issuer"
          placeholder={isLoadingAll ? 'Loading issuers...' : 'Choose an issuer'}
          data={filteredIssuers.map(issuer => ({
            value: issuer.id,
            label: `${issuer.shorthand} - ${issuer.name} (by ${
              issuer.owner?.username || 'Unknown'
            })`,
          }))}
          value={localSelectedIssuerId}
          onChange={setLocalSelectedIssuerId}
          nothingFoundMessage="No issuers found"
          mb="xl"
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => localSelectedIssuerId && onSubmit(localSelectedIssuerId)}
            loading={holderJoinMutation.isPending}
            disabled={!localSelectedIssuerId}
          >
            Submit Request
          </Button>
        </Group>
      </Stack>
    );
  };

  const handleJoinRequest = async (issuerId: string) => {
    if (!issuerId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a issuer',
        color: 'red',
      });
      return;
    }

    try {
      await refreshSession();
      await holderJoinMutation.mutateAsync({
        issuerId,
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

  const openDetailsModal = (issuer: Issuer) => {
    const issuerColor = getIssuerColor(issuer.id);

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
          <Box
            p="lg"
            bg={`${issuerColor}.6`}
            style={{
              color: 'white',
              borderTopLeftRadius: 'var(--mantine-radius-md)',
              borderTopRightRadius: 'var(--mantine-radius-md)',
            }}
          >
            <Group justify="space-between">
              <Flex gap="md" align="center">
                {issuer.logoUrl ? (
                  <Avatar src={issuer.logoUrl} size={50} radius="md" bg="white" />
                ) : (
                  <ThemeIcon size={50} radius="md" variant="filled" color={`${issuerColor}.3`}>
                    <IconSchool size={30} color="white" />
                  </ThemeIcon>
                )}
                <Box>
                  <Text size="xl" fw={700} c="white">
                    {issuer.shorthand}
                  </Text>
                  <Badge
                    color={`${issuerColor}.2`}
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

          <Box p="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
              <Paper withBorder p="md" radius="md">
                <Group mb="xs">
                  <ThemeIcon color="blue" variant="light" size="md">
                    <IconInfoCircle size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    Issuer Details
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Box>
                    <Text size="xs" c="dimmed">
                      ID:
                    </Text>
                    <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                      {issuer.id}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Name:
                    </Text>
                    <Text size="sm">{issuer.name}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">
                      Admin:
                    </Text>
                    <Text size="sm">{issuer.owner?.username || 'Unknown'}</Text>
                  </Box>
                </Stack>
              </Paper>

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

            <Paper withBorder p="md" radius="md">
              <Group mb="xs">
                <ThemeIcon color="blue" variant="light" size="md">
                  <IconBuildingCommunity size={16} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  About this Issuer
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {issuer.description || 'No description provided for this issuer.'}
              </Text>
            </Paper>
          </Box>
        </Box>
      ),
    });
  };

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

  const renderIssuerCard = (issuer: Issuer) => {
    const issuerColor = getIssuerColor(issuer.id);

    return (
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={issuer.id}>
        <Paper shadow="xs" p={0} radius="md" withBorder>
          <Flex direction="column" h="100%">
            <Box
              bg={`${issuerColor}.6`}
              p="md"
              style={{
                borderTopLeftRadius: 'var(--mantine-radius-md)',
                borderTopRightRadius: 'var(--mantine-radius-md)',
              }}
            >
              <Flex gap="md" align="center">
                {issuer.logoUrl ? (
                  <Avatar src={issuer.logoUrl} size={64} radius="md" bg="white" />
                ) : (
                  <ThemeIcon size={64} radius="md" variant="filled" color={`${issuerColor}.3`}>
                    <IconSchool size={40} color="white" />
                  </ThemeIcon>
                )}
                <Box>
                  <Text fw={700} size="lg" c="white" lh={1.3}>
                    {issuer.shorthand}
                  </Text>
                  <Badge variant="filled" size="sm" color={`${issuerColor}.8`}>
                    Active Member
                  </Badge>
                </Box>
              </Flex>
            </Box>

            <Stack p="md" style={{ flex: 1 }}>
              <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
                {issuer.description || 'No description available.'}
              </Text>

              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Admin: {issuer.owner?.username || 'Unknown admin'}
                </Text>
              </Group>
            </Stack>

            <Box p="md" pt={0}>
              <Button
                fullWidth
                variant="light"
                onClick={() => openDetailsModal(issuer)}
                rightSection={<IconInfoCircle size={16} />}
              >
                View Details
              </Button>
            </Box>
          </Flex>
        </Paper>
      </Grid.Col>
    );
  };

  const renderPendingAffiliationCard = (affiliation: any) => {
    const issuerColor = getIssuerColor(affiliation.issuer.id);
    const statusColor = affiliation.status === 'pending' ? 'yellow' : issuerColor;

    return (
      <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={affiliation.id}>
        <Paper shadow="xs" p={0} radius="md" withBorder>
          <Flex direction="column" h="100%">
            <Box
              bg={`${statusColor}.6`}
              p="md"
              style={{
                borderTopLeftRadius: 'var(--mantine-radius-md)',
                borderTopRightRadius: 'var(--mantine-radius-md)',
              }}
            >
              <Flex gap="md" align="center">
                {affiliation.issuer.logoUrl ? (
                  <Avatar src={affiliation.issuer.logoUrl} size={64} radius="md" bg="white" />
                ) : (
                  <ThemeIcon size={64} radius="md" variant="filled" color={`${statusColor}.3`}>
                    <IconSchool size={40} color="white" />
                  </ThemeIcon>
                )}
                <Box>
                  <Text fw={700} size="lg" c="white" lh={1.3}>
                    {affiliation.issuer.shorthand}
                  </Text>
                  <Badge
                    variant="filled"
                    size="sm"
                    color={`${statusColor}.8`}
                    leftSection={getStatusIcon(affiliation.status)}
                  >
                    {affiliation.status.charAt(0).toUpperCase() + affiliation.status.slice(1)}
                  </Badge>
                </Box>
              </Flex>
            </Box>

            <Stack p="md" style={{ flex: 1 }}>
              <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
                {affiliation.issuer.description || 'No description available.'}
              </Text>

              <Group gap="xs">
                <IconCalendar size={16} stroke={1.5} />
                <Text size="sm" c="dimmed">
                  Request Date: {new Date(affiliation.createdAt).toLocaleDateString()}
                </Text>
              </Group>
            </Stack>

            {affiliation.initiatedBy === 'issuer' && (
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

            {affiliation.initiatedBy === 'holder' && (
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
  };

  const isLoading =
    isLoadingIssuers ||
    isLoadingPendingAffiliations ||
    holderJoinMutation.isPending ||
    respondToAffiliationMutation.isPending;

  const noIssuersMessage = (
    <Alert
      icon={<IconBuildingCommunity size={24} />}
      title="No issuer affiliations"
      color="blue"
      radius="md"
      variant="light"
    >
      <Text>
        You are not affiliated with any issuers yet. Use the button above to request to join a
        issuer.
      </Text>
      <Button
        onClick={openJoinModal}
        leftSection={<IconPlus size={16} />}
        mt="md"
        size="sm"
        variant="light"
      >
        Join a Issuer
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
      <Text>You don't have any pending issuer affiliation requests.</Text>
      <Button
        onClick={openJoinModal}
        leftSection={<IconPlus size={16} />}
        mt="md"
        size="sm"
        variant="light"
      >
        Join a Issuer
      </Button>
    </Alert>
  );

  return (
    <Container size="xl">
      <Box mb="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>My Issuers</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openJoinModal}
            variant="filled"
            radius="md"
          >
            Join Issuer
          </Button>
        </Group>
        <Text c="dimmed" size="sm" mt={4}>
          Manage your issuer affiliations and view pending requests
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
                issuers.length > 0 ? (
                  <Badge size="xs" variant="filled" color="blue">
                    {issuers.length}
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
            {!isLoading && issuers.length === 0 ? (
              noIssuersMessage
            ) : (
              <Grid gutter="md">{issuers.map(issuer => renderIssuerCard(issuer))}</Grid>
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
