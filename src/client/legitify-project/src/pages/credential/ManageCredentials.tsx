import { CredentialDocument } from '@/api/credentials/credential.models';
import {
  useAcceptCredentialMutation,
  useDenyCredentialMutation,
} from '@/api/credentials/credential.mutations';
import { useMyCredentialsQuery } from '@/api/credentials/credential.queries';
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
  IconInfoCircle,
  IconThumbDown,
  IconThumbUp,
  IconX,
} from '@tabler/icons-react';

export default function ManageCredentials() {
  const theme = useMantineTheme();
  const { data: credentials, isLoading, error, refetch } = useMyCredentialsQuery();
  const acceptMutation = useAcceptCredentialMutation();
  const denyMutation = useDenyCredentialMutation();

  const openDenyConfirmModal = (credential: CredentialDocument) => {
    modals.openConfirmModal({
      title: (
        <Group>
          <ThemeIcon color="red" size="md" variant="light">
            <IconAlertCircle size={16} />
          </ThemeIcon>
          <Text>Confirm Credential Rejection</Text>
        </Group>
      ),
      children: (
        <Text size="sm">
          Are you sure you want to reject this credential from{' '}
          <Text span fw={600}>
            {credential.issuer}
          </Text>
          ? This action cannot be undone and will permanently mark this credential as invalid.
        </Text>
      ),
      labels: { confirm: 'Yes, reject credential', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => handleDeny(credential.docId),
    });
  };

  const handleAccept = async (docId: string) => {
    try {
      await acceptMutation.mutateAsync(docId);
      notifications.show({
        title: 'Credential Accepted',
        message: 'The credential has been successfully accepted and is now verified.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as Error).message || 'Failed to accept credential',
        color: 'red',
      });
    }
  };

  const handleDeny = async (docId: string) => {
    try {
      await denyMutation.mutateAsync(docId);
      notifications.show({
        title: 'Credential Rejected',
        message: 'The credential has been rejected.',
        color: 'red',
        icon: <IconX size={16} />,
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: (error as Error).message || 'Failed to reject credential',
        color: 'red',
      });
    }
  };

  const pendingCredentials =
    credentials?.filter((credential: CredentialDocument) => credential.status === 'issued') || [];
  const acceptedCredentials =
    credentials?.filter((credential: CredentialDocument) => credential.status === 'accepted') || [];
  const deniedCredentials =
    credentials?.filter((credential: CredentialDocument) => credential.status === 'denied') || [];

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

  const renderCredentialCard = (credential: CredentialDocument) => (
    <Card
      key={credential.docId}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        borderLeft: `4px solid ${
          credential.status === 'accepted'
            ? theme.colors.green[6]
            : credential.status === 'denied'
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
              credential.status === 'accepted'
                ? 'green'
                : credential.status === 'denied'
                ? 'red'
                : 'blue'
            }
          >
            {getStatusIcon(credential.status)}
          </ThemeIcon>
          <div>
            <Text fw={600} size="md">
              From: {credential.issuer}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(credential.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </div>
        </Group>
        {getStatusBadge(credential.status)}
      </Group>

      <Divider my="sm" />

      <Text size="sm" mb="sm">
        Document ID:{' '}
        <Text span fw={500}>
          {credential.docId}
        </Text>
      </Text>

      {credential.status === 'issued' && (
        <Box mt="md">
          <Text size="xs" c="dimmed" mb="xs">
            This credential requires your verification. Please review and accept if it's legitimate.
          </Text>
          <Group justify="flex-end" mt="md">
            <Tooltip label="Accept this credential as valid">
              <Button
                size="sm"
                color="green"
                leftSection={<IconThumbUp size={16} />}
                onClick={() => handleAccept(credential.docId)}
                loading={acceptMutation.isPending}
              >
                Accept
              </Button>
            </Tooltip>
            <Tooltip label="Reject this credential as invalid">
              <Button
                size="sm"
                color="red"
                variant="light"
                leftSection={<IconThumbDown size={16} />}
                onClick={() => openDenyConfirmModal(credential)}
                loading={denyMutation.isPending}
              >
                Reject
              </Button>
            </Tooltip>
          </Group>
        </Box>
      )}

      {credential.status === 'accepted' && (
        <Text size="xs" c="dimmed" mt="md">
          This credential has been verified and is stored on the blockchain.
        </Text>
      )}

      {credential.status === 'denied' && (
        <Text size="xs" c="dimmed" mt="md">
          This credential has been rejected and marked as invalid.
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
        No credentials found
      </Title>
      <Text size="sm" c="dimmed" maw={400} mx="auto" mb="xl">
        You don't have any credentials yet. When a issuer issues a credential to you, it will appear
        here.
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
    if (!credentials || credentials.length === 0) return null;

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
                {pendingCredentials.length}
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
                {acceptedCredentials.length}
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
                {deniedCredentials.length}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>
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
              About Your Credentials
            </Text>
            <Text size="xs" c="dimmed">
              Here you can manage your academic credentials. When a issuer issues a credential to
              you, you need to accept it to verify its authenticity. Accepted credentials are
              securely stored on the blockchain and can be shared with verifiers.
            </Text>
          </div>
        </Group>
      </Paper>

      {renderStatusSummary()}

      {error && (
        <Alert color="red" mb="lg" title="Error loading credentials">
          {(error as Error).message}
        </Alert>
      )}

      <div style={{ position: 'relative', minHeight: isLoading ? '400px' : 'auto' }}>
        <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />

        {!isLoading && (
          <>
            {!credentials?.length ? (
              renderEmptyState()
            ) : (
              <Tabs defaultValue="all" mb="xl">
                <Tabs.List mb="md">
                  <Tabs.Tab value="all" leftSection={<IconEye size={16} />}>
                    All Credentials ({credentials.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="pending"
                    leftSection={<IconClock size={16} />}
                    rightSection={
                      pendingCredentials.length > 0 ? (
                        <Badge size="sm" color="blue" variant="filled">
                          {pendingCredentials.length}
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
                  <Stack>{credentials?.map(renderCredentialCard)}</Stack>
                </Tabs.Panel>

                <Tabs.Panel value="pending">
                  {pendingCredentials.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{pendingCredentials.map(renderCredentialCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="accepted">
                  {acceptedCredentials.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{acceptedCredentials.map(renderCredentialCard)}</Stack>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="rejected">
                  {deniedCredentials.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <Stack>{deniedCredentials.map(renderCredentialCard)}</Stack>
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
