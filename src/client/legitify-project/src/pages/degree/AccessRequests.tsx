import { useGrantAccessMutation } from '@/api/degrees/degree.mutations';
import { useAccessRequestsQuery } from '@/api/degrees/degree.queries';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconEye,
  IconInfoCircle,
  IconLock,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { AccessRequest } from '../../api/degrees/degree.models';

export default function AccessRequests() {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const { data: requests, isLoading, error, refetch } = useAccessRequestsQuery();
  const grantMutation = useGrantAccessMutation();
  const [activeTab, setActiveTab] = useState<string | null>('all');

  // Organize requests by status
  const pendingRequests = requests?.filter(req => req.status === 'pending') || [];
  const grantedRequests = requests?.filter(req => req.status === 'granted') || [];
  const deniedRequests = requests?.filter(req => req.status === 'denied') || [];

  // Filter requests based on active tab
  const filteredRequests =
    activeTab === 'pending'
      ? pendingRequests
      : activeTab === 'granted'
      ? grantedRequests
      : activeTab === 'denied'
      ? deniedRequests
      : requests || [];

  // Add direct access for debugging
  const handleDirectGrant = (requestId: string, granted: boolean) => {
    console.log(`Direct grant called with: requestId=${requestId}, granted=${granted}`);
    handleGrantAccess(requestId, granted);
  };

  // Fix the modal implementation with better styling and positioning
  const openGrantConfirmModal = (request: AccessRequest): void => {
    console.log('Opening grant confirmation modal for request:', request);

    modals.open({
      title: (
        <Group>
          <ThemeIcon color="green" size="md" variant="light">
            <IconCheck size={16} />
          </ThemeIcon>
          <Text fw={600}>Grant Access Request</Text>
        </Group>
      ),
      overlayProps: {
        color: colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
        opacity: 0.55,
        blur: 3,
      },
      size: 'md',
      radius: 'md',
      shadow: 'xl',
      padding: 'xl',
      withCloseButton: true,
      children: (
        <>
          <Text size="sm" mb="lg">
            Are you sure you want to grant access to your credential for{' '}
            <Text span fw={600} c="primaryBlue">
              {request.employerName}
            </Text>
            ? They will be able to view your degree details and verification status.
          </Text>
          <Text size="xs" c="dimmed" mb="xl">
            Document ID: {request.docId}
          </Text>
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => modals.closeAll()}>
              Cancel
            </Button>
            <Button
              color="green"
              leftSection={<IconThumbUp size={16} />}
              onClick={() => {
                console.log('Modal confirmed - granting access to:', request.requestId);
                handleDirectGrant(request.requestId, true);
                modals.closeAll();
              }}
            >
              Grant Access
            </Button>
          </Group>
        </>
      ),
    });
  };

  const openDenyConfirmModal = (request: AccessRequest): void => {
    console.log('Opening deny confirmation modal for request:', request);

    modals.open({
      title: (
        <Group>
          <ThemeIcon color="red" size="md" variant="light">
            <IconX size={16} />
          </ThemeIcon>
          <Text fw={600}>Deny Access Request</Text>
        </Group>
      ),
      centered: true,
      overlayProps: {
        color: colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
        opacity: 0.55,
        blur: 3,
      },
      size: 'md',
      radius: 'md',
      shadow: 'xl',
      padding: 'xl',
      withCloseButton: true,
      children: (
        <>
          <Text size="sm" mb="lg">
            Are you sure you want to deny the access request from{' '}
            <Text span fw={600} c="red">
              {request.employerName}
            </Text>
            ? They will not be able to access your credential.
          </Text>
          <Text size="xs" c="dimmed" mb="xl">
            Document ID: {request.docId}
          </Text>
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => modals.closeAll()}>
              Cancel
            </Button>
            <Button
              color="red"
              leftSection={<IconThumbDown size={16} />}
              onClick={() => {
                console.log('Modal confirmed - denying access to:', request.requestId);
                handleDirectGrant(request.requestId, false);
                modals.closeAll();
              }}
            >
              Deny Access
            </Button>
          </Group>
        </>
      ),
    });
  };

  const handleGrantAccess = async (requestId: string, granted: boolean): Promise<void> => {
    console.log(`Starting handleGrantAccess: requestId=${requestId}, granted=${granted}`);

    try {
      console.log('About to call grantMutation.mutateAsync with:', { requestId, granted });

      // Check if requestId is valid
      if (!requestId) {
        console.error('Invalid requestId:', requestId);
        throw new Error('Invalid request ID');
      }

      // Use direct object instead of parameter destructuring for clearer debugging
      const requestParams = { requestId, granted };
      console.log('Request params:', requestParams);

      const result = await grantMutation.mutateAsync(requestParams);
      console.log('Grant mutation completed successfully:', result);

      notifications.show({
        title: granted ? 'Access Granted' : 'Access Denied',
        message: granted
          ? 'The employer can now view your credentials'
          : 'The access request has been denied',
        color: granted ? 'green' : 'red',
        icon: granted ? <IconCheck size={16} /> : <IconX size={16} />,
      });

      // Force refetch after a short delay to ensure backend has processed the change
      setTimeout(() => {
        console.log('Refetching access requests...');
        refetch();
      }, 500);
    } catch (error) {
      console.error('Error details:', error);
      notifications.show({
        title: 'Error',
        message: (error as Error).message || 'Failed to process request',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status: string): JSX.Element => {
    switch (status) {
      case 'granted':
        return <Badge color="green">Granted</Badge>;
      case 'denied':
        return <Badge color="red">Denied</Badge>;
      case 'pending':
        return <Badge color="yellow">Pending</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case 'granted':
        return <IconCheck size={18} color={theme.colors.green[6]} />;
      case 'denied':
        return <IconX size={18} color={theme.colors.red[6]} />;
      case 'pending':
        return <IconClock size={18} color={theme.colors.yellow[6]} />;
      default:
        return <IconInfoCircle size={18} />;
    }
  };

  const renderRequestCard = (request: AccessRequest): JSX.Element => (
    <Card
      key={request.requestId}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderLeft: `4px solid ${
          request.status === 'granted'
            ? theme.colors.green[6]
            : request.status === 'denied'
            ? theme.colors.red[6]
            : theme.colors.yellow[6]
        }`,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group>
          <ThemeIcon
            size="lg"
            radius="md"
            variant="light"
            color={
              request.status === 'granted'
                ? 'green'
                : request.status === 'denied'
                ? 'red'
                : 'yellow'
            }
          >
            {getStatusIcon(request.status)}
          </ThemeIcon>
          <div>
            <Text fw={600} size="md">
              From: {request.employerName}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(request.requestDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </div>
        </Group>
        {getStatusBadge(request.status)}
      </Group>

      <Divider my="sm" />

      <Text size="sm" mb="sm">
        Document ID:{' '}
        <Text span fw={500}>
          {request.docId}
        </Text>
      </Text>

      {request.status === 'pending' && (
        <Box mt="md">
          <Text size="xs" c="dimmed" mb="xs">
            This employer is requesting access to view your degree credentials.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              size="sm"
              color="green"
              leftSection={<IconThumbUp size={16} />}
              onClick={() => {
                console.log('Grant Access button clicked for request:', request);
                openGrantConfirmModal(request);
              }}
              loading={grantMutation.isPending}
            >
              Grant Access
            </Button>
            <Button
              size="sm"
              color="red"
              variant="light"
              leftSection={<IconThumbDown size={16} />}
              onClick={() => openDenyConfirmModal(request)}
              loading={grantMutation.isPending}
            >
              Deny Access
            </Button>
          </Group>
        </Box>
      )}

      {request.status === 'granted' && (
        <Text size="xs" c="dimmed" mt="md">
          You've granted access to this credential. The employer can now view your verified degree.
        </Text>
      )}

      {request.status === 'denied' && (
        <Text size="xs" c="dimmed" mt="md">
          You've denied access to this credential. The employer cannot view your degree.
        </Text>
      )}
    </Card>
  );

  const renderEmptyState = () => (
    <Paper withBorder p="xl" radius="md" ta="center">
      <ThemeIcon size={60} radius="md" color="blue" variant="light" mx="auto" mb="md">
        <IconLock size={30} />
      </ThemeIcon>
      <Title order={3} mb="xs">
        No access requests found
      </Title>
      <Text size="sm" c="dimmed" maw={400} mx="auto" mb="xl">
        {activeTab !== 'all'
          ? `You don't have any ${activeTab} access requests`
          : "You don't have any access requests yet. When an employer requests access to your credentials, it will appear here."}
      </Text>
    </Paper>
  );

  const renderLoadingState = () => (
    <Stack>
      {[1, 2, 3].map(i => (
        <Paper key={i} withBorder p="lg" radius="md">
          <Group mb="md">
            <Skeleton height={40} circle />
            <div style={{ flex: 1 }}>
              <Skeleton height={12} width="60%" mb="xs" />
              <Skeleton height={10} width="30%" />
            </div>
            <Skeleton height={20} width={80} />
          </Group>
          <Skeleton height={10} width="90%" mb="xs" />
          <Skeleton height={10} width="40%" mb="xl" />
          <Group justify="flex-end">
            <Skeleton height={30} width={100} />
            <Skeleton height={30} width={100} />
          </Group>
        </Paper>
      ))}
    </Stack>
  );

  const renderStatusSummary = () => {
    if (!requests || requests.length === 0) return null;

    return (
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon color="yellow" size="lg" radius="md" variant="light">
              <IconClock size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Pending
              </Text>
              <Text fw={700} size="xl">
                {pendingRequests.length}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon color="green" size="lg" radius="md" variant="light">
              <IconCheck size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Granted
              </Text>
              <Text fw={700} size="xl">
                {grantedRequests.length}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon color="red" size="lg" radius="md" variant="light">
              <IconX size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Denied
              </Text>
              <Text fw={700} size="xl">
                {deniedRequests.length}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>
    );
  };

  const renderAlert = () => {
    if (!pendingRequests.length) return null;

    return (
      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="yellow"
        title="Pending Access Requests"
        mb="xl"
      >
        You have {pendingRequests.length} pending access{' '}
        {pendingRequests.length === 1 ? 'request' : 'requests'}
        that {pendingRequests.length === 1 ? 'requires' : 'require'} your attention.
      </Alert>
    );
  };
  return (
    <Container size="lg" py="xl">
      <Paper p="md" withBorder radius="md" mb="xl">
        <Group>
          <ThemeIcon size={42} radius="md" color="primaryBlue" variant="light">
            <IconInfoCircle size={24} />
          </ThemeIcon>
          <div>
            <Text fw={500} size="sm">
              About Access Requests
            </Text>
            <Text size="xs" c="dimmed">
              When employers want to view your verified credentials, they send an access request.
              You can grant or deny these requests to control who can access your academic records.
            </Text>
          </div>
        </Group>
      </Paper>

      {renderAlert()}
      {renderStatusSummary()}

      {error && (
        <Alert color="red" mb="lg" title="Error loading requests">
          {(error as Error).message}
        </Alert>
      )}

      <div style={{ position: 'relative', minHeight: isLoading ? '400px' : 'auto' }}>
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

        {!isLoading && (
          <>
            {!requests?.length ? (
              renderEmptyState()
            ) : (
              <Tabs defaultValue="all" value={activeTab} onChange={setActiveTab} mb="xl">
                <Tabs.List mb="md">
                  <Tabs.Tab value="all" leftSection={<IconEye size={16} />}>
                    All Requests ({requests.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="pending"
                    leftSection={<IconClock size={16} />}
                    rightSection={
                      pendingRequests.length > 0 ? (
                        <Badge size="sm" color="yellow" variant="filled">
                          {pendingRequests.length}
                        </Badge>
                      ) : null
                    }
                  >
                    Pending
                  </Tabs.Tab>
                  <Tabs.Tab value="granted" leftSection={<IconCheck size={16} />}>
                    Granted
                  </Tabs.Tab>
                  <Tabs.Tab value="denied" leftSection={<IconX size={16} />}>
                    Denied
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="all">
                  <Stack>{filteredRequests?.map(renderRequestCard)}</Stack>
                </Tabs.Panel>

                <Tabs.Panel value="pending">
                  {pendingRequests.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{pendingRequests.map(renderRequestCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="granted">
                  {grantedRequests.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{grantedRequests.map(renderRequestCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="denied">
                  {deniedRequests.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{deniedRequests.map(renderRequestCard)}</Stack>
                  )}
                </Tabs.Panel>
              </Tabs>
            )}
          </>
        )}

        {isLoading && renderLoadingState()}
      </div>
    </Container>
  );
}
