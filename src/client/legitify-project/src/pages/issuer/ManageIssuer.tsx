import { useRecentIssuedCredentialsQuery } from '@/api/credentials/credential.queries';
import {
  useAddHolderMutation,
  useCreateIssuerMutation,
  useJoinIssuerMutation,
  useRegisterHolderMutation,
  useRespondToAffiliationMutation,
  useRespondToJoinRequestMutation,
} from '@/api/issuers/issuer.mutations';
import {
  issuerKeys,
  useAllIssuersQuery,
  useMyPendingJoinRequestsQuery,
  usePendingAffiliationsQuery,
  usePendingJoinRequestsQuery,
  usePrimaryIssuerQuery,
} from '@/api/issuers/issuer.queries';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  List,
  LoadingOverlay,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconActivity,
  IconArrowRight,
  IconBuildingCommunity,
  IconCheck,
  IconClockHour4,
  IconInfoCircle,
  IconMailForward,
  IconPlus,
  IconSchool,
  IconSend,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface NewHolderForm {
  email: string;
}

interface RegisterHolderForm {
  email: string;
  username: string;
  password: string;
}

export default function ManageIssuer() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);
  const [joinModalOpened, { open: openJoinModal, close: closeJoinModal }] = useDisclosure(false);
  const [registerModalOpened, { open: openRegisterModal, close: closeRegisterModal }] =
    useDisclosure(false);
  const [csvModalOpened, { open: openCsvModal, close: closeCsvModal }] = useDisclosure(false);

  const { refreshSession, user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  const roleForQuery = user?.role === 'issuer' || user?.role === 'holder' ? user.role : undefined;
  const { data: issuer, isLoading: isLoadingIssuer } = usePrimaryIssuerQuery(
    user?.id,
    roleForQuery,
  );

  const { data: allIssuers = [], isLoading: isLoadingAllIssuers } = useAllIssuersQuery({
    enabled: joinModalOpened,
  });

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery({ enabled: !!issuer?.id });

  const { data: recentIssuedCredentials = [], isLoading: isLoadingRecentCredentials } =
    useRecentIssuedCredentialsQuery({ enabled: !!issuer?.id });

  const { data: pendingJoinRequests = [], isLoading: isLoadingPendingJoinRequests } =
    usePendingJoinRequestsQuery({
      enabled: !!issuer?.id && user?.id === issuer?.ownerId,
    });

  const { data: myPendingJoinRequests = [], isLoading: isLoadingMyPendingJoinRequests } =
    useMyPendingJoinRequestsQuery({
      enabled: !issuer && user?.role === 'issuer',
    });

  const createIssuerMutation = useCreateIssuerMutation();
  const joinIssuerMutation = useJoinIssuerMutation();
  const addHolderMutation = useAddHolderMutation();
  const registerHolderMutation = useRegisterHolderMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();
  const respondToJoinRequestMutation = useRespondToJoinRequestMutation();

  const newHolderForm = useForm<NewHolderForm>({
    initialValues: { email: '' },
    validate: { email: value => (value ? null : 'Email is required') },
  });

  const createIssuerForm = useForm({
    initialValues: { name: '', displayName: '', description: '' },
    validate: {
      name: value => (value ? null : 'Identifier is required'),
      displayName: value => (value ? null : 'Display name is required'),
    },
  });

  const joinIssuerForm = useForm({
    initialValues: { issuerId: '' },
    validate: { issuerId: value => (value ? null : 'Please select a issuer') },
  });

  const registerHolderForm = useForm<RegisterHolderForm>({
    initialValues: { email: '', username: '', password: '' },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  const handleCreateIssuer = async (values: {
    name: string;
    displayName: string;
    description: string;
  }) => {
    try {
      setError(null);
      await refreshSession();
      await createIssuerMutation.mutateAsync(values);
      setSuccess('Issuer created successfully');
      closeCreateModal();
    } catch (err: any) {
      setError(err.message || 'Failed to create issuer');
    }
  };

  const handleJoinIssuer = async (values: { issuerId: string }) => {
    try {
      setError(null);
      await refreshSession();
      await joinIssuerMutation.mutateAsync({ issuerId: values.issuerId });
      await queryClient.invalidateQueries({ queryKey: issuerKeys.myPendingJoinRequests() });
      setSuccess('Join request sent successfully. Waiting for approval.');
      closeJoinModal();
    } catch (err: any) {
      setError(err.message || 'Failed to send join request');
    }
  };

  const handleAddHolder = async (values: NewHolderForm) => {
    try {
      if (!issuer) return setError('No issuer found');
      setError(null);
      await refreshSession();
      await addHolderMutation.mutateAsync({
        issuerId: issuer.id,
        holderEmail: values.email,
      });
      setSuccess(`Invitation sent to ${values.email}`);
      newHolderForm.reset();
    } catch (err: any) {
      setError(err.message || 'Failed to add holder');
    }
  };

  const handleRegisterHolder = async (values: RegisterHolderForm) => {
    try {
      if (!issuer) return setError('No issuer found');
      setError(null);
      await refreshSession();
      await registerHolderMutation.mutateAsync({ ...values, issuerId: issuer.id });
      setSuccess(
        `Holder ${values.username} registered and automatically affiliated with ${issuer.displayName}`,
      );
      registerHolderForm.reset();
      closeRegisterModal();
    } catch (err: any) {
      setError(err.message || 'Failed to register holder');
    }
  };

  const handleCsvUpload = () => {
    setSuccess('CSV upload functionality coming soon!');
    closeCsvModal();
  };

  const handleAffiliationResponse = async (affiliationId: string, accept: boolean) => {
    try {
      setError(null);
      await refreshSession();
      await respondToAffiliationMutation.mutateAsync({ affiliationId, accept });
      await queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
      await queryClient.invalidateQueries({ queryKey: issuerKeys.pendingAffiliations() });
      if (user?.role === 'holder') {
        await queryClient.invalidateQueries({ queryKey: issuerKeys.holderAffiliations() });
      }
      setSuccess(`Request ${accept ? 'approved' : 'rejected'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to respond to affiliation');
    }
  };

  const handleJoinRequestResponse = async (requestId: string, accept: boolean) => {
    try {
      setError(null);
      await refreshSession();
      await respondToJoinRequestMutation.mutateAsync({ requestId, accept });
      await queryClient.invalidateQueries({ queryKey: issuerKeys.my() });
      await queryClient.invalidateQueries({ queryKey: issuerKeys.pendingJoinRequests() });
      if (user?.role === 'holder') {
        await queryClient.invalidateQueries({ queryKey: issuerKeys.holderAffiliations() });
      }
      setSuccess(`Join request ${accept ? 'approved' : 'rejected'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to respond to join request');
    }
  };

  const modalStyles = {
    header: {
      background: 'transparent',
      borderBottom: isDarkMode ? '1px solid #2C2E33' : '1px solid #e9ecef',
      paddingBottom: 10,
    },
    title: { fontSize: '1.1rem', fontWeight: 600 },
    body: { paddingTop: 15, paddingBottom: 15 },
    close: {
      color: isDarkMode ? '#909296' : '#495057',
      '&:hover': {
        background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      },
    },
    content: { maxHeight: '90vh', overflow: 'auto' },
  };

  const renderIssuerOverview = () => {
    if (!issuer) return null;
    const activeHoldersCount = issuer.affiliations?.filter(a => a.status === 'active')?.length || 0;
    const pendingHolderRequestsCount =
      pendingAffiliations?.filter(a => a.initiatedBy === 'holder' || !a.initiatedBy).length || 0;
    const pendingAdminRequestsCount = pendingJoinRequests.length || 0;

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Stack gap={0}>
            <Title order={3}>{issuer.displayName}</Title>
            <Text c="dimmed" size="sm">
              ID: {issuer.id}
            </Text>
          </Stack>
        </Group>
        <Divider my="sm" />
        <Group grow>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {activeHoldersCount}
            </Text>
            <Text size="sm" c="dimmed">
              Active Holders
            </Text>
          </Stack>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {pendingHolderRequestsCount}
            </Text>
            <Text size="sm" c="dimmed">
              Pending Holder Requests
            </Text>
          </Stack>
          {user?.id === issuer.ownerId && (
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700}>
                {pendingAdminRequestsCount}
              </Text>
              <Text size="sm" c="dimmed">
                Pending Admin Requests
              </Text>
            </Stack>
          )}
        </Group>
      </Card>
    );
  };

  const renderRecentActivity = () => {
    if (!issuer) return null;
    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Group>
            <IconActivity size={20} />
            <Title order={4}>Recent Activity</Title>
          </Group>
          <Button
            component={Link}
            to="/credential/all-records"
            variant="subtle"
            size="sm"
            rightSection={<IconArrowRight size={14} />}
          >
            View All Records
          </Button>
        </Group>
        {isLoadingRecentCredentials ? (
          <Text c="dimmed">Loading recent credentials...</Text>
        ) : recentIssuedCredentials.length > 0 ? (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Recipient</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentIssuedCredentials.slice(0, 5).map(credential => (
                <Table.Tr key={credential.docId}>
                  <Table.Td>{credential.recipientName || credential.issuedTo}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        credential.status === 'accepted'
                          ? 'green'
                          : credential.status === 'denied'
                          ? 'red'
                          : 'blue'
                      }
                      variant="light"
                    >
                      {credential.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{new Date(credential.issueDate).toLocaleDateString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">No recent credential issuances found.</Text>
        )}
      </Card>
    );
  };

  const renderHolderManagement = () => {
    if (!issuer) return null;

    const activeHolders = issuer.affiliations?.filter(a => a.status === 'active') || [];
    const holderInitiatedRequests =
      pendingAffiliations?.filter(
        affiliation => affiliation.initiatedBy === 'holder' || !affiliation.initiatedBy,
      ) || [];
    const issuerInitiatedRequests =
      pendingAffiliations?.filter(affiliation => affiliation.initiatedBy === 'issuer') || [];

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group mb="md">
          <IconUsersGroup size={20} />
          <Title order={4}>Holder Management</Title>
        </Group>
        <Tabs defaultValue="actions">
          <Tabs.List grow>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
            <Tabs.Tab value="affiliated">Affiliated ({activeHolders.length})</Tabs.Tab>
            <Tabs.Tab
              value="requests"
              rightSection={
                holderInitiatedRequests.length > 0 ? (
                  <Badge size="sm" circle color="red">
                    {holderInitiatedRequests.length}
                  </Badge>
                ) : null
              }
            >
              Join Requests
            </Tabs.Tab>
            <Tabs.Tab value="sent">Sent Invitations ({issuerInitiatedRequests.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="actions" pt="md">
            <Stack>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="xs">
                  Invite Existing Holder
                </Title>
                <form onSubmit={newHolderForm.onSubmit(handleAddHolder)}>
                  <Group align="flex-end">
                    <TextInput
                      label="Holder Email"
                      placeholder="Enter holder's email address"
                      required
                      style={{ flex: 1 }}
                      {...newHolderForm.getInputProps('email')}
                    />
                    <Button type="submit" loading={addHolderMutation.isPending}>
                      Invite Holder
                    </Button>
                  </Group>
                </form>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="xs">
                  Register New Holder
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  Create new accounts for holders, automatically affiliating them with{' '}
                  {issuer.displayName}.
                </Text>
                <Group>
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={openRegisterModal}
                    variant="light"
                    loading={registerHolderMutation.isPending}
                  >
                    Register Holder
                  </Button>
                  <Button
                    leftSection={<IconSend size={16} />}
                    onClick={openCsvModal}
                    variant="light"
                  >
                    Batch Upload (CSV)
                  </Button>
                </Group>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="affiliated" pt="md">
            {activeHolders.length === 0 ? (
              <Text c="dimmed">No holders affiliated yet.</Text>
            ) : (
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Username</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activeHolders.map(affiliation => (
                    <Table.Tr key={affiliation.id}>
                      <Table.Td>{affiliation.user.username}</Table.Td>
                      <Table.Td>{affiliation.user.email}</Table.Td>
                      <Table.Td>
                        <Badge color="green" variant="light">
                          Active
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="requests" pt="md">
            {isLoadingPendingAffiliations ? (
              <Text c="dimmed">Loading join requests...</Text>
            ) : holderInitiatedRequests.length === 0 ? (
              <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Join Requests">
                No holders have requested to join your issuer.
              </Alert>
            ) : (
              <>
                <Text mb="md" size="sm">
                  Review and respond to holders requesting to join {issuer.displayName}.
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Holder</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Requested On</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {holderInitiatedRequests.map(affiliation => (
                      <Table.Tr key={affiliation.id}>
                        <Table.Td>{affiliation.user.username}</Table.Td>
                        <Table.Td>{affiliation.user.email}</Table.Td>
                        <Table.Td>{new Date(affiliation.createdAt).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              color="green"
                              variant="light"
                              leftSection={<IconCheck size={14} />}
                              onClick={() => handleAffiliationResponse(affiliation.id, true)}
                              loading={
                                respondToAffiliationMutation.isPending &&
                                respondToAffiliationMutation.variables?.affiliationId ===
                                  affiliation.id
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              leftSection={<IconX size={14} />}
                              onClick={() => handleAffiliationResponse(affiliation.id, false)}
                              loading={
                                respondToAffiliationMutation.isPending &&
                                respondToAffiliationMutation.variables?.affiliationId ===
                                  affiliation.id
                              }
                            >
                              Reject
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="sent" pt="md">
            {isLoadingPendingAffiliations ? (
              <Text c="dimmed">Loading sent invitations...</Text>
            ) : issuerInitiatedRequests.length === 0 ? (
              <Alert
                color="blue"
                icon={<IconInfoCircle size={16} />}
                title="No Pending Invitations"
              >
                You haven't sent any invitations that are still pending response.
              </Alert>
            ) : (
              <>
                <Text mb="md" size="sm">
                  You've invited these holders to join {issuer.displayName}. They haven't responded
                  yet.
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Holder</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Invited On</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {issuerInitiatedRequests.map(affiliation => (
                      <Table.Tr key={affiliation.id}>
                        <Table.Td>{affiliation.user.username}</Table.Td>
                        <Table.Td>{affiliation.user.email}</Table.Td>
                        <Table.Td>{new Date(affiliation.createdAt).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                          <Badge color="yellow" variant="light">
                            Awaiting Response
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>
    );
  };

  const renderIssuerAdministration = () => {
    if (!issuer || user?.id !== issuer.ownerId) return null;

    const adminJoinRequests = pendingJoinRequests;

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group mb="md">
          <IconBuildingCommunity size={20} />
          <Title order={4}>Issuer Administration</Title>
        </Group>
        <Tabs defaultValue="join-requests">
          <Tabs.List>
            <Tabs.Tab
              value="join-requests"
              rightSection={
                adminJoinRequests.length > 0 ? (
                  <Badge size="sm" circle color="red">
                    {adminJoinRequests.length}
                  </Badge>
                ) : null
              }
            >
              Admin Join Requests
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="join-requests" pt="md">
            {isLoadingPendingJoinRequests ? (
              <Text c="dimmed">Loading admin join requests...</Text>
            ) : adminJoinRequests.length === 0 ? (
              <Alert
                color="blue"
                icon={<IconInfoCircle size={16} />}
                title="No Admin Join Requests"
              >
                No administrators from other issuers have requested to join {issuer.displayName}.
              </Alert>
            ) : (
              <>
                <Text mb="md" size="sm">
                  Review and respond to administrators requesting to join {issuer.displayName}.
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Admin User</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Requested On</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {adminJoinRequests.map(request => (
                      <Table.Tr key={request.id}>
                        <Table.Td>{request.requester.username}</Table.Td>
                        <Table.Td>{request.requester.email}</Table.Td>
                        <Table.Td>{new Date(request.createdAt).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              color="green"
                              variant="light"
                              leftSection={<IconCheck size={14} />}
                              onClick={() => handleJoinRequestResponse(request.id, true)}
                              loading={
                                respondToJoinRequestMutation.isPending &&
                                respondToJoinRequestMutation.variables?.requestId === request.id
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              leftSection={<IconX size={14} />}
                              onClick={() => handleJoinRequestResponse(request.id, false)}
                              loading={
                                respondToJoinRequestMutation.isPending &&
                                respondToJoinRequestMutation.variables?.requestId === request.id
                              }
                            >
                              Reject
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>
    );
  };

  const renderMyInvitations = () => {
    const invitationsForCurrentUser =
      pendingAffiliations?.filter(
        affiliation => affiliation.initiatedBy === 'issuer' && affiliation.userId === user?.id,
      ) || [];

    if (invitationsForCurrentUser.length === 0 && !isLoadingPendingAffiliations) return null;

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group mb="md">
          <IconMailForward size={20} />
          <Title order={4}>My Invitations</Title>
        </Group>
        {isLoadingPendingAffiliations ? (
          <Text c="dimmed">Loading invitations...</Text>
        ) : invitationsForCurrentUser.length === 0 ? (
          <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Invitations">
            You don't have any pending invitations from issuers.
          </Alert>
        ) : (
          <>
            <Text mb="md" size="sm">
              These issuers have invited you to join them. Accept to become affiliated.
            </Text>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Issuer</Table.Th>
                  <Table.Th>Invited On</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invitationsForCurrentUser.map(affiliation => (
                  <Table.Tr key={affiliation.id}>
                    <Table.Td>{affiliation.issuer.displayName}</Table.Td>
                    <Table.Td>{new Date(affiliation.createdAt).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          color="green"
                          variant="light"
                          leftSection={<IconCheck size={14} />}
                          onClick={() => handleAffiliationResponse(affiliation.id, true)}
                          loading={
                            respondToAffiliationMutation.isPending &&
                            respondToAffiliationMutation.variables?.affiliationId === affiliation.id
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          leftSection={<IconX size={14} />}
                          onClick={() => handleAffiliationResponse(affiliation.id, false)}
                          loading={
                            respondToAffiliationMutation.isPending &&
                            respondToAffiliationMutation.variables?.affiliationId === affiliation.id
                          }
                        >
                          Decline
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Card>
    );
  };

  const renderIssuerSkeletons = () => (
    <>
      <Skeleton height={180} radius="md" mb="xl" />
      <Skeleton height={250} radius="md" mb="xl" />
      <Skeleton height={400} radius="md" mb="xl" />
    </>
  );

  if (isLoadingIssuer) {
    return (
      <Container size="lg">
        <Title order={2} mb="xl">
          Manage Issuer
        </Title>
        {renderIssuerSkeletons()}
      </Container>
    );
  }

  if (!issuer) {
    return (
      <Container size="md">
        <Title order={2} mb="xl" ta="center">
          Manage Issuer
        </Title>
        <Paper withBorder p="xl" radius="md" shadow="xs" mb="xl">
          <Alert icon={<IconInfoCircle size="1rem" />} color="blue" mb="lg" title="Get Started">
            You don't have a issuer affiliation yet. Create a new issuer profile or request to join
            an existing one.
          </Alert>
          <Group grow>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Create Issuer
            </Button>
            <Button
              variant="outline"
              leftSection={<IconSchool size={16} />}
              onClick={openJoinModal}
            >
              Join Existing Issuer
            </Button>
          </Group>
        </Paper>

        {user?.role === 'issuer' && (
          <Paper withBorder p="xl" radius="md" shadow="xs">
            <Title order={4} mb="md">
              My Pending Join Requests
            </Title>
            {isLoadingMyPendingJoinRequests ? (
              <Skeleton height={100} />
            ) : myPendingJoinRequests.length === 0 ? (
              <Text c="dimmed">You have not requested to join any issuers yet.</Text>
            ) : (
              <List
                spacing="sm"
                size="sm"
                center
                icon={
                  <ThemeIcon color="blue" size={20} radius="xl">
                    <IconClockHour4 size={12} />
                  </ThemeIcon>
                }
              >
                {myPendingJoinRequests.map(request => (
                  <List.Item key={request.id}>
                    Requested to join{' '}
                    <Text span fw={500}>
                      {request.issuer.displayName}
                    </Text>{' '}
                    on {new Date(request.createdAt).toLocaleDateString()} - Status:{' '}
                    <Badge color="blue" variant="light">
                      Pending Approval
                    </Badge>
                  </List.Item>
                ))}
              </List>
            )}
          </Paper>
        )}

        <Modal
          opened={createModalOpened}
          onClose={closeCreateModal}
          title="Create Issuer"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={createIssuerForm.onSubmit(handleCreateIssuer)} noValidate>
            <Stack>
              <TextInput
                label="Issuer Identifier"
                description="Unique identifier (lowercase, no spaces, e.g., 'dublin-city-issuer')"
                placeholder="e.g. dublin-city-issuer"
                required
                {...createIssuerForm.getInputProps('name')}
              />
              <TextInput
                label="Display Name"
                description="The name that will be displayed to users"
                placeholder="e.g. Dublin City Issuer"
                required
                {...createIssuerForm.getInputProps('displayName')}
              />
              <TextInput
                label="Description"
                placeholder="Brief description of your issuer"
                {...createIssuerForm.getInputProps('description')}
              />
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={createIssuerMutation.isPending}>
                  Create Issuer
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={joinModalOpened}
          onClose={closeJoinModal}
          title="Join Issuer"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={joinIssuerForm.onSubmit(handleJoinIssuer)}>
            <Stack>
              <Select
                label="Select Issuer"
                description="Request to join an existing issuer"
                placeholder={isLoadingAllIssuers ? 'Loading...' : 'Select a issuer'}
                data={allIssuers.map(uni => ({ value: uni.id, label: uni.displayName }))}
                searchable
                required
                disabled={isLoadingAllIssuers}
                {...joinIssuerForm.getInputProps('issuerId')}
              />
              <Text size="sm" c="dimmed">
                Your request will need to be approved by the issuer administrators.
              </Text>
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeJoinModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={joinIssuerMutation.isPending}>
                  Send Request
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Box style={{ position: 'relative' }}>
        <LoadingOverlay
          visible={
            isLoadingPendingAffiliations ||
            isLoadingPendingJoinRequests ||
            isLoadingRecentCredentials
          }
        />

        {error && (
          <Alert title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md">
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            title="Success"
            color="green"
            withCloseButton
            onClose={() => setSuccess(null)}
            mb="md"
          >
            {success}
          </Alert>
        )}

        <Stack gap="xl">
          {isLoadingRecentCredentials ||
          isLoadingPendingAffiliations ||
          isLoadingPendingJoinRequests ? (
            renderIssuerSkeletons()
          ) : (
            <>
              {renderIssuerOverview()}
              {renderRecentActivity()}
              {renderHolderManagement()}
              {renderIssuerAdministration()}
              {renderMyInvitations()}
            </>
          )}
        </Stack>

        <Modal
          opened={registerModalOpened}
          onClose={closeRegisterModal}
          title="Register New Holder"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={registerHolderForm.onSubmit(handleRegisterHolder)}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="holder@example.com"
                required
                {...registerHolderForm.getInputProps('email')}
              />
              <TextInput
                label="Username"
                placeholder="holder_username"
                required
                {...registerHolderForm.getInputProps('username')}
              />
              <PasswordInput
                label="Password"
                placeholder="********"
                required
                {...registerHolderForm.getInputProps('password')}
              />
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeRegisterModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={registerHolderMutation.isPending}>
                  Register Holder
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={csvModalOpened}
          onClose={closeCsvModal}
          title="Batch Register Holders (CSV)"
          styles={modalStyles}
          centered
          size="md"
        >
          <Stack>
            <Text size="sm">Upload a CSV file to register multiple holders at once.</Text>
            <Text size="xs" c="dimmed">
              (Feature coming soon)
            </Text>
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeCsvModal}>
                Cancel
              </Button>
              <Button onClick={handleCsvUpload} disabled>
                Submit CSV
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Box>
    </Container>
  );
}
