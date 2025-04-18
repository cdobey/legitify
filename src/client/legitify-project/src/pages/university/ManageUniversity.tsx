import { useRecentIssuedDegreesQuery } from '@/api/degrees/degree.queries';
import {
  useAddStudentMutation,
  useCreateUniversityMutation,
  useJoinUniversityMutation,
  useRegisterStudentMutation,
  useRespondToAffiliationMutation,
  useRespondToJoinRequestMutation,
} from '@/api/universities/university.mutations';
import {
  universityKeys,
  useAllUniversitiesQuery,
  useMyPendingJoinRequestsQuery,
  usePendingAffiliationsQuery,
  usePendingJoinRequestsQuery,
  usePrimaryUniversityQuery,
} from '@/api/universities/university.queries';
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

interface NewStudentForm {
  email: string;
}

interface RegisterStudentForm {
  email: string;
  username: string;
  password: string;
}

export default function ManageUniversities() {
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

  const roleForQuery =
    user?.role === 'university' || user?.role === 'individual' ? user.role : undefined;
  const { data: university, isLoading: isLoadingUniversity } = usePrimaryUniversityQuery(
    user?.id,
    roleForQuery,
  );

  const { data: allUniversities = [], isLoading: isLoadingAllUniversities } =
    useAllUniversitiesQuery({ enabled: joinModalOpened });

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery({ enabled: !!university?.id });

  const { data: recentIssuedDegrees = [], isLoading: isLoadingRecentDegrees } =
    useRecentIssuedDegreesQuery({ enabled: !!university?.id });

  const { data: pendingJoinRequests = [], isLoading: isLoadingPendingJoinRequests } =
    usePendingJoinRequestsQuery({
      enabled: !!university?.id && user?.id === university?.ownerId,
    });

  const { data: myPendingJoinRequests = [], isLoading: isLoadingMyPendingJoinRequests } =
    useMyPendingJoinRequestsQuery({
      enabled: !university && user?.role === 'university',
    });

  const createUniversityMutation = useCreateUniversityMutation();
  const joinUniversityMutation = useJoinUniversityMutation();
  const addStudentMutation = useAddStudentMutation();
  const registerStudentMutation = useRegisterStudentMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();
  const respondToJoinRequestMutation = useRespondToJoinRequestMutation();

  const newStudentForm = useForm<NewStudentForm>({
    initialValues: { email: '' },
    validate: { email: value => (value ? null : 'Email is required') },
  });

  const createUniversityForm = useForm({
    initialValues: { name: '', displayName: '', description: '' },
    validate: {
      name: value => (value ? null : 'Identifier is required'),
      displayName: value => (value ? null : 'Display name is required'),
    },
  });

  const joinUniversityForm = useForm({
    initialValues: { universityId: '' },
    validate: { universityId: value => (value ? null : 'Please select a university') },
  });

  const registerStudentForm = useForm<RegisterStudentForm>({
    initialValues: { email: '', username: '', password: '' },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  const handleCreateUniversity = async (values: {
    name: string;
    displayName: string;
    description: string;
  }) => {
    try {
      setError(null);
      await refreshSession();
      await createUniversityMutation.mutateAsync(values);
      setSuccess('University created successfully');
      closeCreateModal();
    } catch (err: any) {
      setError(err.message || 'Failed to create university');
    }
  };

  const handleJoinUniversity = async (values: { universityId: string }) => {
    try {
      setError(null);
      await refreshSession();
      await joinUniversityMutation.mutateAsync({ universityId: values.universityId });
      await queryClient.invalidateQueries({ queryKey: universityKeys.myPendingJoinRequests() });
      setSuccess('Join request sent successfully. Waiting for approval.');
      closeJoinModal();
    } catch (err: any) {
      setError(err.message || 'Failed to send join request');
    }
  };

  const handleAddStudent = async (values: NewStudentForm) => {
    try {
      if (!university) return setError('No university found');
      setError(null);
      await refreshSession();
      await addStudentMutation.mutateAsync({
        universityId: university.id,
        studentEmail: values.email,
      });
      setSuccess(`Invitation sent to ${values.email}`);
      newStudentForm.reset();
    } catch (err: any) {
      setError(err.message || 'Failed to add student');
    }
  };

  const handleRegisterStudent = async (values: RegisterStudentForm) => {
    try {
      if (!university) return setError('No university found');
      setError(null);
      await refreshSession();
      await registerStudentMutation.mutateAsync({ ...values, universityId: university.id });
      setSuccess(
        `Student ${values.username} registered and automatically affiliated with ${university.displayName}`,
      );
      registerStudentForm.reset();
      closeRegisterModal();
    } catch (err: any) {
      setError(err.message || 'Failed to register student');
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
      await queryClient.invalidateQueries({ queryKey: universityKeys.my() });
      await queryClient.invalidateQueries({ queryKey: universityKeys.pendingAffiliations() });
      if (user?.role === 'individual') {
        await queryClient.invalidateQueries({ queryKey: universityKeys.studentAffiliations() });
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
      await queryClient.invalidateQueries({ queryKey: universityKeys.my() });
      await queryClient.invalidateQueries({ queryKey: universityKeys.pendingJoinRequests() });
      if (user?.role === 'individual') {
        await queryClient.invalidateQueries({ queryKey: universityKeys.studentAffiliations() });
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

  const renderUniversityOverview = () => {
    if (!university) return null;
    const activeStudentsCount =
      university.affiliations?.filter(a => a.status === 'active')?.length || 0;
    const pendingStudentRequestsCount =
      pendingAffiliations?.filter(a => a.initiatedBy === 'student' || !a.initiatedBy).length || 0;
    const pendingAdminRequestsCount = pendingJoinRequests.length || 0;

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Stack gap={0}>
            <Title order={3}>{university.displayName}</Title>
            <Text c="dimmed" size="sm">
              ID: {university.id}
            </Text>
          </Stack>
        </Group>
        <Divider my="sm" />
        <Group grow>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {activeStudentsCount}
            </Text>
            <Text size="sm" c="dimmed">
              Active Students
            </Text>
          </Stack>
          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {pendingStudentRequestsCount}
            </Text>
            <Text size="sm" c="dimmed">
              Pending Student Requests
            </Text>
          </Stack>
          {user?.id === university.ownerId && (
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
    if (!university) return null;
    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Group>
            <IconActivity size={20} />
            <Title order={4}>Recent Activity</Title>
          </Group>
          <Button
            component={Link}
            to="/degree/all-records"
            variant="subtle"
            size="sm"
            rightSection={<IconArrowRight size={14} />}
          >
            View All Records
          </Button>
        </Group>
        {isLoadingRecentDegrees ? (
          <Text c="dimmed">Loading recent degrees...</Text>
        ) : recentIssuedDegrees.length > 0 ? (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Recipient</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentIssuedDegrees.slice(0, 5).map(degree => (
                <Table.Tr key={degree.docId}>
                  <Table.Td>{degree.recipientName || degree.issuedTo}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        degree.status === 'accepted'
                          ? 'green'
                          : degree.status === 'denied'
                          ? 'red'
                          : 'blue'
                      }
                      variant="light"
                    >
                      {degree.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{new Date(degree.issueDate).toLocaleDateString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed">No recent degree issuances found.</Text>
        )}
      </Card>
    );
  };

  const renderStudentManagement = () => {
    if (!university) return null;

    const activeStudents = university.affiliations?.filter(a => a.status === 'active') || [];
    const studentInitiatedRequests =
      pendingAffiliations?.filter(
        affiliation => affiliation.initiatedBy === 'student' || !affiliation.initiatedBy,
      ) || [];
    const universityInitiatedRequests =
      pendingAffiliations?.filter(affiliation => affiliation.initiatedBy === 'university') || [];

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group mb="md">
          <IconUsersGroup size={20} />
          <Title order={4}>Student Management</Title>
        </Group>
        <Tabs defaultValue="actions">
          <Tabs.List grow>
            <Tabs.Tab value="actions">Actions</Tabs.Tab>
            <Tabs.Tab value="affiliated">Affiliated ({activeStudents.length})</Tabs.Tab>
            <Tabs.Tab
              value="requests"
              rightSection={
                studentInitiatedRequests.length > 0 ? (
                  <Badge size="sm" circle color="red">
                    {studentInitiatedRequests.length}
                  </Badge>
                ) : null
              }
            >
              Join Requests
            </Tabs.Tab>
            <Tabs.Tab value="sent">
              Sent Invitations ({universityInitiatedRequests.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="actions" pt="md">
            <Stack>
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="xs">
                  Invite Existing Student
                </Title>
                <form onSubmit={newStudentForm.onSubmit(handleAddStudent)}>
                  <Group align="flex-end">
                    <TextInput
                      label="Student Email"
                      placeholder="Enter student's email address"
                      required
                      style={{ flex: 1 }}
                      {...newStudentForm.getInputProps('email')}
                    />
                    <Button type="submit" loading={addStudentMutation.isPending}>
                      Invite Student
                    </Button>
                  </Group>
                </form>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="xs">
                  Register New Student
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  Create new accounts for students, automatically affiliating them with{' '}
                  {university.displayName}.
                </Text>
                <Group>
                  <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={openRegisterModal}
                    variant="light"
                    loading={registerStudentMutation.isPending}
                  >
                    Register Individual
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
            {activeStudents.length === 0 ? (
              <Text c="dimmed">No students affiliated yet.</Text>
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
                  {activeStudents.map(affiliation => (
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
            ) : studentInitiatedRequests.length === 0 ? (
              <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Join Requests">
                No students have requested to join your university.
              </Alert>
            ) : (
              <>
                <Text mb="md" size="sm">
                  Review and respond to students requesting to join {university.displayName}.
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Student</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Requested On</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {studentInitiatedRequests.map(affiliation => (
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
            ) : universityInitiatedRequests.length === 0 ? (
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
                  You've invited these students to join {university.displayName}. They haven't
                  responded yet.
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Student</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Invited On</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {universityInitiatedRequests.map(affiliation => (
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

  const renderUniversityAdministration = () => {
    if (!university || user?.id !== university.ownerId) return null;

    const adminJoinRequests = pendingJoinRequests;

    return (
      <Card withBorder shadow="sm" p="lg" mb="xl">
        <Group mb="md">
          <IconBuildingCommunity size={20} />
          <Title order={4}>University Administration</Title>
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
                No administrators from other universities have requested to join{' '}
                {university.displayName}.
              </Alert>
            ) : (
              <>
                <Text mb="md" size="sm">
                  Review and respond to administrators requesting to join {university.displayName}.
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
        affiliation => affiliation.initiatedBy === 'university' && affiliation.userId === user?.id,
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
            You don't have any pending invitations from universities.
          </Alert>
        ) : (
          <>
            <Text mb="md" size="sm">
              These universities have invited you to join them. Accept to become affiliated.
            </Text>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>University</Table.Th>
                  <Table.Th>Invited On</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invitationsForCurrentUser.map(affiliation => (
                  <Table.Tr key={affiliation.id}>
                    <Table.Td>{affiliation.university.displayName}</Table.Td>
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

  const renderUniversitySkeletons = () => (
    <>
      <Skeleton height={180} radius="md" mb="xl" />
      <Skeleton height={250} radius="md" mb="xl" />
      <Skeleton height={400} radius="md" mb="xl" />
    </>
  );

  if (isLoadingUniversity) {
    return (
      <Container size="lg">
        <Title order={2} mb="xl">
          Manage University
        </Title>
        {renderUniversitySkeletons()}
      </Container>
    );
  }

  if (!university) {
    return (
      <Container size="md">
        <Title order={2} mb="xl" ta="center">
          Manage University
        </Title>
        <Paper withBorder p="xl" radius="md" shadow="xs" mb="xl">
          <Alert icon={<IconInfoCircle size="1rem" />} color="blue" mb="lg" title="Get Started">
            You don't have a university affiliation yet. Create a new university profile or request
            to join an existing one.
          </Alert>
          <Group grow>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Create University
            </Button>
            <Button
              variant="outline"
              leftSection={<IconSchool size={16} />}
              onClick={openJoinModal}
            >
              Join Existing University
            </Button>
          </Group>
        </Paper>

        {user?.role === 'university' && (
          <Paper withBorder p="xl" radius="md" shadow="xs">
            <Title order={4} mb="md">
              My Pending Join Requests
            </Title>
            {isLoadingMyPendingJoinRequests ? (
              <Skeleton height={100} />
            ) : myPendingJoinRequests.length === 0 ? (
              <Text c="dimmed">You have not requested to join any universities yet.</Text>
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
                      {request.university.displayName}
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
          title="Create University"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={createUniversityForm.onSubmit(handleCreateUniversity)} noValidate>
            <Stack>
              <TextInput
                label="University Identifier"
                description="Unique identifier (lowercase, no spaces, e.g., 'dublin-city-university')"
                placeholder="e.g. dublin-city-university"
                required
                {...createUniversityForm.getInputProps('name')}
              />
              <TextInput
                label="Display Name"
                description="The name that will be displayed to users"
                placeholder="e.g. Dublin City University"
                required
                {...createUniversityForm.getInputProps('displayName')}
              />
              <TextInput
                label="Description"
                placeholder="Brief description of your university"
                {...createUniversityForm.getInputProps('description')}
              />
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={createUniversityMutation.isPending}>
                  Create University
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={joinModalOpened}
          onClose={closeJoinModal}
          title="Join University"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={joinUniversityForm.onSubmit(handleJoinUniversity)}>
            <Stack>
              <Select
                label="Select University"
                description="Request to join an existing university"
                placeholder={isLoadingAllUniversities ? 'Loading...' : 'Select a university'}
                data={allUniversities.map(uni => ({ value: uni.id, label: uni.displayName }))}
                searchable
                required
                disabled={isLoadingAllUniversities}
                {...joinUniversityForm.getInputProps('universityId')}
              />
              <Text size="sm" c="dimmed">
                Your request will need to be approved by the university administrators.
              </Text>
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeJoinModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={joinUniversityMutation.isPending}>
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
            isLoadingPendingAffiliations || isLoadingPendingJoinRequests || isLoadingRecentDegrees
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
          {isLoadingRecentDegrees ||
          isLoadingPendingAffiliations ||
          isLoadingPendingJoinRequests ? (
            renderUniversitySkeletons()
          ) : (
            <>
              {renderUniversityOverview()}
              {renderRecentActivity()}
              {renderStudentManagement()}
              {renderUniversityAdministration()}
              {renderMyInvitations()}
            </>
          )}
        </Stack>

        <Modal
          opened={registerModalOpened}
          onClose={closeRegisterModal}
          title="Register New Student"
          styles={modalStyles}
          centered
          size="md"
        >
          <form onSubmit={registerStudentForm.onSubmit(handleRegisterStudent)}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="student@example.com"
                required
                {...registerStudentForm.getInputProps('email')}
              />
              <TextInput
                label="Username"
                placeholder="student_username"
                required
                {...registerStudentForm.getInputProps('username')}
              />
              <PasswordInput
                label="Password"
                placeholder="********"
                required
                {...registerStudentForm.getInputProps('password')}
              />
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeRegisterModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={registerStudentMutation.isPending}>
                  Register Student
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal
          opened={csvModalOpened}
          onClose={closeCsvModal}
          title="Batch Register Students (CSV)"
          styles={modalStyles}
          centered
          size="md"
        >
          <Stack>
            <Text size="sm">Upload a CSV file to register multiple students at once.</Text>
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
