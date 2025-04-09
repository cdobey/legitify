import { DegreeDocument } from '@/api/degrees/degree.models';
import { useAcceptDegreeMutation, useDenyDegreeMutation } from '@/api/degrees/degree.mutations';
import { useMyDegreesQuery } from '@/api/degrees/degree.queries';
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
  Popover,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCertificate,
  IconCheck,
  IconClock,
  IconEye,
  IconFilter,
  IconInfoCircle,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function ManageDegrees() {
  const theme = useMantineTheme();
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const { data: degrees, isLoading, error, refetch } = useMyDegreesQuery();
  const acceptMutation = useAcceptDegreeMutation();
  const denyMutation = useDenyDegreeMutation();

  const openDenyConfirmModal = (degree: DegreeDocument) => {
    modals.openConfirmModal({
      title: (
        <Group>
          <ThemeIcon color="red" size="md" variant="light">
            <IconAlertCircle size={16} />
          </ThemeIcon>
          <Text>Confirm Degree Rejection</Text>
        </Group>
      ),
      children: (
        <Text size="sm">
          Are you sure you want to reject this degree from{' '}
          <Text span fw={600}>
            {degree.issuer}
          </Text>
          ? This action cannot be undone and will permanently mark this credential as invalid.
        </Text>
      ),
      labels: { confirm: 'Yes, reject degree', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => handleDeny(degree.docId),
    });
  };

  const handleAccept = async (docId: string) => {
    try {
      await acceptMutation.mutateAsync(docId);
      notifications.show({
        title: 'Degree Accepted',
        message: 'The degree has been successfully accepted and is now verified.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as Error).message || 'Failed to accept degree',
        color: 'red',
      });
    }
  };

  const handleDeny = async (docId: string) => {
    try {
      await denyMutation.mutateAsync(docId);
      notifications.show({
        title: 'Degree Rejected',
        message: 'The degree has been rejected.',
        color: 'red',
        icon: <IconX size={16} />,
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as Error).message || 'Failed to reject degree',
        color: 'red',
      });
    }
  };

  const filteredDegrees = degrees?.filter(
    (degree: DegreeDocument) => statusFilter === 'all' || degree.status === statusFilter,
  );

  const pendingDegrees =
    degrees?.filter((degree: DegreeDocument) => degree.status === 'issued') || [];
  const acceptedDegrees =
    degrees?.filter((degree: DegreeDocument) => degree.status === 'accepted') || [];
  const deniedDegrees =
    degrees?.filter((degree: DegreeDocument) => degree.status === 'denied') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge color="green">Accepted</Badge>;
      case 'denied':
        return <Badge color="red">Rejected</Badge>;
      case 'issued':
        return <Badge color="blue">Pending</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <IconCheck size={18} color={theme.colors.green[6]} />;
      case 'denied':
        return <IconX size={18} color={theme.colors.red[6]} />;
      case 'issued':
        return <IconClock size={18} color={theme.colors.blue[6]} />;
      default:
        return <IconInfoCircle size={18} />;
    }
  };

  const renderDegreeCard = (degree: DegreeDocument) => (
    <Card
      key={degree.docId}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderLeft: `4px solid ${
          degree.status === 'accepted'
            ? theme.colors.green[6]
            : degree.status === 'denied'
            ? theme.colors.red[6]
            : theme.colors.blue[6]
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
              degree.status === 'accepted' ? 'green' : degree.status === 'denied' ? 'red' : 'blue'
            }
          >
            {getStatusIcon(degree.status)}
          </ThemeIcon>
          <div>
            <Text fw={600} size="md">
              From: {degree.issuer}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(degree.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </div>
        </Group>
        {getStatusBadge(degree.status)}
      </Group>

      <Divider my="sm" />

      <Text size="sm" mb="sm">
        Document ID:{' '}
        <Text span fw={500}>
          {degree.docId}
        </Text>
      </Text>

      {degree.status === 'issued' && (
        <Box mt="md">
          <Text size="xs" c="dimmed" mb="xs">
            This degree requires your verification. Please review and accept if it's legitimate.
          </Text>
          <Group justify="flex-end" mt="md">
            <Tooltip label="Accept this degree as valid">
              <Button
                size="sm"
                color="green"
                leftSection={<IconThumbUp size={16} />}
                onClick={() => handleAccept(degree.docId)}
                loading={acceptMutation.isPending}
              >
                Accept
              </Button>
            </Tooltip>
            <Tooltip label="Reject this degree as invalid">
              <Button
                size="sm"
                color="red"
                variant="light"
                leftSection={<IconThumbDown size={16} />}
                onClick={() => openDenyConfirmModal(degree)}
                loading={denyMutation.isPending}
              >
                Reject
              </Button>
            </Tooltip>
          </Group>
        </Box>
      )}

      {degree.status === 'accepted' && (
        <Text size="xs" c="dimmed" mt="md">
          This degree has been verified and is stored on the blockchain.
        </Text>
      )}

      {degree.status === 'denied' && (
        <Text size="xs" c="dimmed" mt="md">
          This degree has been rejected and marked as invalid.
        </Text>
      )}
    </Card>
  );

  const renderEmptyState = () => (
    <Paper withBorder p="xl" radius="md" ta="center">
      <ThemeIcon size={60} radius="md" color="blue" variant="light" mx="auto" mb="md">
        <IconCertificate size={30} />
      </ThemeIcon>
      <Title order={3} mb="xs">
        No degrees found
      </Title>
      <Text size="sm" c="dimmed" maw={400} mx="auto" mb="xl">
        {statusFilter !== 'all'
          ? `You don't have any degrees with status "${statusFilter}"`
          : "You don't have any degrees yet. When a university issues a degree to you, it will appear here."}
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
    if (!degrees || degrees.length === 0) return null;

    return (
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon color="blue" size="lg" radius="md" variant="light">
              <IconClock size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Pending
              </Text>
              <Text fw={700} size="xl">
                {pendingDegrees.length}
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
                Accepted
              </Text>
              <Text fw={700} size="xl">
                {acceptedDegrees.length}
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
                Rejected
              </Text>
              <Text fw={700} size="xl">
                {deniedDegrees.length}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>
    );
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Popover width={300} position="bottom-end" shadow="md">
          <Popover.Target>
            <Button variant="subtle" leftSection={<IconFilter size={16} />}>
              Filter by Status
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack>
              <Select
                label="Filter credentials by status"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'all', label: 'All Credentials' },
                  { value: 'issued', label: 'Pending Verification' },
                  { value: 'accepted', label: 'Accepted' },
                  { value: 'denied', label: 'Rejected' },
                ]}
              />
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Paper p="md" withBorder radius="md" mb="xl">
        <Group>
          <ThemeIcon size={42} radius="md" color="primaryBlue" variant="light">
            <IconInfoCircle size={24} />
          </ThemeIcon>
          <div>
            <Text fw={500} size="sm">
              About Your Credentials
            </Text>
            <Text size="xs" c="dimmed">
              Here you can manage your academic credentials. When a university issues a degree to
              you, you need to accept it to verify its authenticity. Accepted credentials are
              securely stored on the blockchain and can be shared with employers.
            </Text>
          </div>
        </Group>
      </Paper>

      {renderStatusSummary()}

      {error && (
        <Alert color="red" mb="lg" title="Error loading degrees">
          {(error as Error).message}
        </Alert>
      )}

      <div style={{ position: 'relative', minHeight: isLoading ? '400px' : 'auto' }}>
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

        {!isLoading && (
          <>
            {!degrees?.length ? (
              renderEmptyState()
            ) : (
              <Tabs defaultValue="all" mb="xl">
                <Tabs.List mb="md">
                  <Tabs.Tab value="all" leftSection={<IconEye size={16} />}>
                    All Credentials ({degrees.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="pending"
                    leftSection={<IconClock size={16} />}
                    rightSection={
                      pendingDegrees.length > 0 ? (
                        <Badge size="sm" color="blue" variant="filled">
                          {pendingDegrees.length}
                        </Badge>
                      ) : null
                    }
                  >
                    Pending
                  </Tabs.Tab>
                  <Tabs.Tab value="accepted" leftSection={<IconCheck size={16} />}>
                    Accepted
                  </Tabs.Tab>
                  <Tabs.Tab value="rejected" leftSection={<IconX size={16} />}>
                    Rejected
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="all">
                  <Stack>{filteredDegrees?.map(renderDegreeCard)}</Stack>
                </Tabs.Panel>

                <Tabs.Panel value="pending">
                  {pendingDegrees.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{pendingDegrees.map(renderDegreeCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="accepted">
                  {acceptedDegrees.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{acceptedDegrees.map(renderDegreeCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="rejected">
                  {deniedDegrees.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{deniedDegrees.map(renderDegreeCard)}</Stack>
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
