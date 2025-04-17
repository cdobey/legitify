import { useRecentIssuedDegreesQuery } from '@/api/degrees/degree.queries';
import { University } from '@/api/universities/university.models';
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
  useMyUniversitiesQuery,
  usePendingAffiliationsQuery,
  usePendingJoinRequestsQuery,
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
  LoadingOverlay,
  Modal,
  PasswordInput,
  Select,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
  IconPlus,
  IconSchool,
  IconSend,
  IconUser,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

// Define only the form interfaces that aren't imported
interface NewStudentForm {
  email: string;
}

interface RegisterStudentForm {
  email: string;
  username: string;
  password: string;
}

export default function ManageUniversities() {
  const [university, setUniversity] = useState<University | null>(null);
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

  // Modal styles based on theme
  const modalStyles = {
    header: {
      background: 'transparent',
      borderBottom: isDarkMode ? '1px solid #2C2E33' : '1px solid #e9ecef',
      paddingBottom: 10,
    },
    title: {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
    body: {
      paddingTop: 15,
      paddingBottom: 15,
    },
    close: {
      color: isDarkMode ? '#909296' : '#495057',
      '&:hover': {
        background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      },
    },
    content: {
      maxHeight: '90vh',
      overflow: 'auto',
    },
  };

  const {
    data: universities,
    isLoading: isLoadingUniversities,
    error: universitiesError,
  } = useMyUniversitiesQuery();

  const createUniversityMutation = useCreateUniversityMutation();
  const joinUniversityMutation = useJoinUniversityMutation();
  const addStudentMutation = useAddStudentMutation();
  const registerStudentMutation = useRegisterStudentMutation();
  const respondToAffiliationMutation = useRespondToAffiliationMutation();
  const respondToJoinRequestMutation = useRespondToJoinRequestMutation();

  const { data: allUniversities = [], isLoading: isLoadingAllUniversities } =
    useAllUniversitiesQuery({
      enabled: joinModalOpened,
    });

  const { data: pendingAffiliations = [], isLoading: isLoadingPendingAffiliations } =
    usePendingAffiliationsQuery({
      enabled: !!university?.id,
    });

  const { data: recentIssuedDegrees, isLoading: isLoadingRecentDegrees } =
    useRecentIssuedDegreesQuery({
      enabled: !!university,
    });

  const { data: pendingJoinRequests = [], isLoading: isLoadingPendingJoinRequests } =
    usePendingJoinRequestsQuery({
      enabled: !!university?.id,
    });

  const isLoading =
    isLoadingUniversities || createUniversityMutation.isPending || joinUniversityMutation.isPending;

  const newStudentForm = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: value => (value ? null : 'Email is required'),
    },
  });

  const createUniversityForm = useForm({
    initialValues: {
      name: '',
      displayName: '',
      description: '',
    },
    validate: {
      name: value => (value ? null : 'Identifier is required'),
      displayName: value => (value ? null : 'Display name is required'),
    },
  });

  const joinUniversityForm = useForm({
    initialValues: {
      universityId: '',
    },
    validate: {
      universityId: value => (value ? null : 'Please select a university'),
    },
  });

  const registerStudentForm = useForm({
    initialValues: {
      email: '',
      username: '',
      password: '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  useEffect(() => {
    if (universities && universities.length > 0) {
      if (user?.role === 'university') {
        const ownedUniversity = universities.find(uni => uni.ownerId === user.id);

        if (ownedUniversity) {
          setUniversity({
            ...ownedUniversity,
            affiliations: ownedUniversity.affiliations || [],
          });
        } else {
          // If they don't own any universities, show the first one they're a member of
          const memberUniversity = universities[0];
          setUniversity({
            ...memberUniversity,
            affiliations: memberUniversity.affiliations || [],
          });
        }
      } else {
        // For individual users, show their affiliated university
        const uni = universities[0];
        setUniversity({
          ...uni,
          affiliations: uni.affiliations || [],
        });
      }
    } else {
      setUniversity(null);
    }
  }, [universities, user]);

  const handleCreateUniversity = async (values: {
    name: string;
    displayName: string;
    description: string;
  }) => {
    try {
      setError(null);
      await refreshSession();
      const response = await createUniversityMutation.mutateAsync(values);
      setUniversity(response.university);
      setSuccess('University created successfully');
      closeCreateModal();
    } catch (err: any) {
      console.error('Failed to create university:', err);
      setError(err.message || 'Failed to create university');
    }
  };

  const handleJoinUniversity = async (values: { universityId: string }) => {
    try {
      setError(null);
      await refreshSession();
      await joinUniversityMutation.mutateAsync({ universityId: values.universityId });
      setSuccess('Join request sent successfully. Waiting for approval.');
      closeJoinModal();
    } catch (err: any) {
      console.error('Failed to send join request:', err);
      setError(err.message || 'Failed to send join request');
    }
  };

  const handleAddStudent = async (values: NewStudentForm) => {
    try {
      setSuccess(null);
      setError(null);

      if (!university) {
        setError('No university found');
        return;
      }

      await refreshSession();
      await addStudentMutation.mutateAsync({
        universityId: university.id,
        studentEmail: values.email,
      });

      setSuccess(`Invitation sent to ${values.email}`);
      newStudentForm.reset();
    } catch (err: any) {
      console.error('Failed to add student:', err);
      setError(err.message || 'Failed to add student');
    }
  };

  const handleRegisterStudent = async (values: RegisterStudentForm) => {
    try {
      setSuccess(null);
      setError(null);

      if (!university) {
        setError('No university found');
        return;
      }

      await refreshSession();
      await registerStudentMutation.mutateAsync({
        email: values.email,
        username: values.username,
        password: values.password,
        universityId: university.id,
      });

      setSuccess(
        `Student ${values.username} registered and automatically affiliated with ${university.displayName}`,
      );
      registerStudentForm.reset();
      closeRegisterModal();
    } catch (err: any) {
      console.error('Failed to register student:', err);
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
      setSuccess(null);
      await refreshSession();

      await respondToAffiliationMutation.mutateAsync({
        affiliationId,
        accept,
      });

      // Manually refetchignn the universities data to update the view - not sure if this will make a difference or not?
      await queryClient.invalidateQueries({ queryKey: universityKeys.my() });
      await queryClient.invalidateQueries({ queryKey: universityKeys.pendingAffiliations() });

      // For individual users, also invalidate student affiliations
      if (user?.role === 'individual') {
        await queryClient.invalidateQueries({ queryKey: universityKeys.studentAffiliations() });
      }

      setSuccess(`Request ${accept ? 'approved' : 'rejected'} successfully`);
    } catch (err: any) {
      console.error('Failed to respond to affiliation:', err);
      setError(err.message || 'Failed to respond to affiliation');
    }
  };

  const handleJoinRequestResponse = async (requestId: string, accept: boolean) => {
    try {
      setError(null);
      setSuccess(null);
      await refreshSession();

      await respondToJoinRequestMutation.mutateAsync({
        requestId,
        accept,
      });

      await queryClient.invalidateQueries({ queryKey: universityKeys.my() });
      await queryClient.invalidateQueries({ queryKey: universityKeys.pendingJoinRequests() });

      if (user?.role === 'individual') {
        await queryClient.invalidateQueries({ queryKey: universityKeys.studentAffiliations() });
      }

      setSuccess(`Join request ${accept ? 'approved' : 'rejected'} successfully`);
    } catch (err: any) {
      console.error('Failed to respond to join request:', err);
      setError(err.message || 'Failed to respond to join request');
    }
  };

  const renderDashboardInfo = () => {
    if (!university) return null;

    return (
      <Group>
        <Card withBorder shadow="sm" p="lg" mb="xl" style={{ flex: 1 }}>
          <Title order={3} mb="md">
            University Dashboard
          </Title>
          <Group>
            <Text fw={600}>University name:</Text>
            <Text>{university.displayName}</Text>
          </Group>
          <Group>
            <Text fw={600}>ID:</Text>
            <Text>{university.id}</Text>
          </Group>
          <Group>
            <Text fw={600}>Students:</Text>
            <Text>{university.affiliations?.filter(a => a.status === 'active')?.length || 0}</Text>
          </Group>
          <Group>
            <Text fw={600}>Pending Requests:</Text>
            <Text>{university.affiliations?.filter(a => a.status === 'pending')?.length || 0}</Text>
          </Group>
        </Card>

        <Card withBorder shadow="sm" p="lg" mb="xl" style={{ flex: 1 }}>
          <Title order={3} mb="md">
            Recent Activity
          </Title>

          {isLoadingRecentDegrees ? (
            <Text c="dimmed">Loading recent degrees...</Text>
          ) : recentIssuedDegrees && recentIssuedDegrees.length > 0 ? (
            <Table>
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
            <Text c="dimmed">No recent degree issuances found</Text>
          )}
        </Card>
      </Group>
    );
  };

  const renderUniversityJoinRequests = () => {
    if (isLoadingPendingJoinRequests) {
      return <Text c="dimmed">Loading join requests...</Text>;
    }

    if (!pendingJoinRequests || pendingJoinRequests.length === 0) {
      return (
        <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Join Requests">
          No universities have requested to join your institution.
        </Alert>
      );
    }

    return (
      <>
        <Text mb="md">
          These universities have requested to join your institution. Review and respond to their
          requests.
        </Text>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>University Admin</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Requested On</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pendingJoinRequests.map(request => (
              <Table.Tr key={request.id}>
                <Table.Td>{request.requester.username}</Table.Td>
                <Table.Td>{request.requester.email}</Table.Td>
                <Table.Td>{new Date(request.createdAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Group>
                    <Button
                      size="xs"
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => handleJoinRequestResponse(request.id, true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="outline"
                      leftSection={<IconX size={16} />}
                      onClick={() => handleJoinRequestResponse(request.id, false)}
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
    );
  };

  const renderStudentJoinRequests = () => {
    if (!university || !pendingAffiliations) return null;

    const studentInitiatedRequests = pendingAffiliations.filter(
      affiliation => affiliation.initiatedBy === 'student' || !affiliation.initiatedBy,
    );

    if (studentInitiatedRequests.length === 0) {
      return (
        <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Join Requests">
          No students have requested to join your university.
        </Alert>
      );
    }

    return (
      <>
        <Text mb="md">
          These students have requested to join your university. Review and respond to their
          requests.
        </Text>

        <Table>
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
                  <Group>
                    <Button
                      size="xs"
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="outline"
                      leftSection={<IconX size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, false)}
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
    );
  };

  const renderPendingInvitations = () => {
    if (!university || !pendingAffiliations) return null;

    const universityInitiatedRequests = pendingAffiliations.filter(
      affiliation => affiliation.initiatedBy === 'university',
    );

    if (universityInitiatedRequests.length === 0) {
      return (
        <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Pending Invitations">
          You haven't sent any invitations that are still pending.
        </Alert>
      );
    }

    return (
      <>
        <Text mb="md">
          You've invited these students to join your university. They haven't responded yet.
        </Text>

        <Table>
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
                  <Badge color="yellow">Awaiting Response</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </>
    );
  };

  const renderInvitationsReceived = () => {
    // Filter for invitations sent to the current user
    const invitationsForCurrentUser = pendingAffiliations
      ? pendingAffiliations.filter(
          affiliation =>
            affiliation.initiatedBy === 'university' && affiliation.userId === user?.id,
        )
      : [];

    if (invitationsForCurrentUser.length === 0) {
      return (
        <Alert color="blue" icon={<IconInfoCircle size={16} />} title="No Invitations">
          You don't have any pending invitations from other universities.
        </Alert>
      );
    }

    return (
      <>
        <Text mb="md">
          These universities have invited you to join them. Accept to become affiliated with them.
        </Text>

        <Table>
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
                  <Group>
                    <Button
                      size="xs"
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, true)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="outline"
                      leftSection={<IconX size={16} />}
                      onClick={() => handleAffiliationResponse(affiliation.id, false)}
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
    );
  };

  const renderAddStudentForm = () => (
    <Box mb="xl">
      <Title order={4} mb="md">
        Add Student
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
          <Button type="submit">Invite Student</Button>
        </Group>
      </form>

      <Divider my="xl" />

      <Group justify="space-between" mb="md">
        <Title order={4}>Register New Students</Title>
        <Group>
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={openRegisterModal}
            variant="light"
          >
            Register Individual
          </Button>
          <Button leftSection={<IconSend size={16} />} onClick={openCsvModal} variant="light">
            Batch Upload
          </Button>
        </Group>
      </Group>

      <Text size="sm" c="dimmed">
        Register students with new accounts that are automatically affiliated with your university.
      </Text>
    </Box>
  );

  if (!isLoading && !university) {
    return (
      <Container size="lg">
        <Title order={2} mb="xl">
          Manage University
        </Title>

        <Alert icon={<IconAlertCircle size="1rem" />} color="blue" mb="lg">
          You don't have a university yet. Create a new one or request to join an existing one.
        </Alert>

        <Group gap="md">
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Create University
          </Button>
          <Button variant="outline" leftSection={<IconSchool size={16} />} onClick={openJoinModal}>
            Join Existing University
          </Button>
        </Group>

        <Modal
          opened={createModalOpened}
          onClose={closeCreateModal}
          title="Create University"
          styles={modalStyles}
          centered
        >
          <form onSubmit={createUniversityForm.onSubmit(handleCreateUniversity)} noValidate>
            <TextInput
              label="University Identifier"
              description="Unique identifier for your university (no spaces)"
              placeholder="e.g. dublin-city-university"
              required
              mb="md"
              {...createUniversityForm.getInputProps('name')}
            />
            <TextInput
              label="Display Name"
              description="The name that will be displayed to users"
              placeholder="e.g. Dublin City University"
              required
              mb="md"
              {...createUniversityForm.getInputProps('displayName')}
            />
            <TextInput
              label="Description"
              placeholder="Brief description of your university"
              mb="xl"
              {...createUniversityForm.getInputProps('description')}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isLoading}>
                Create University
              </Button>
            </Group>
          </form>
        </Modal>

        <Modal
          opened={joinModalOpened}
          onClose={closeJoinModal}
          title="Join University"
          styles={modalStyles}
          centered
        >
          <form onSubmit={joinUniversityForm.onSubmit(handleJoinUniversity)}>
            <Select
              label="Select University"
              description="Request to join an existing university"
              placeholder="Select a university"
              data={allUniversities.map(uni => ({ value: uni.id, label: uni.displayName }))}
              required
              mb="xl"
              {...joinUniversityForm.getInputProps('universityId')}
            />
            <Text size="sm" c="dimmed" mb="md">
              Your request will need to be approved by the university administrators.
            </Text>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeJoinModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isLoading}>
                Send Request
              </Button>
            </Group>
          </form>
        </Modal>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Box style={{ position: 'relative' }}>
        <LoadingOverlay visible={isLoading} />

        <Title order={2} mb="lg">
          Manage University: {university?.displayName || ''}
        </Title>

        {error && (
          <Alert color="red" icon={<IconAlertCircle size="1rem" />} mb="lg">
            {error}
          </Alert>
        )}

        {success && (
          <Alert color="green" icon={<IconCheck size="1rem" />} mb="lg">
            {success}
          </Alert>
        )}

        {university && (
          <>
            {renderDashboardInfo()}

            <Tabs defaultValue="students">
              <Tabs.List mb="md">
                <Tabs.Tab value="students" leftSection={<IconUser size={14} />}>
                  Students
                </Tabs.Tab>
                <Tabs.Tab
                  value="join-requests"
                  leftSection={<IconSchool size={14} />}
                  rightSection={
                    pendingAffiliations?.filter(a => a.initiatedBy === 'student' || !a.initiatedBy)
                      .length > 0 ? (
                      <Badge size="sm" color="red">
                        {
                          pendingAffiliations.filter(
                            a => a.initiatedBy === 'student' || !a.initiatedBy,
                          ).length
                        }
                      </Badge>
                    ) : null
                  }
                >
                  Join Requests
                </Tabs.Tab>
                <Tabs.Tab value="sent-invitations" leftSection={<IconSend size={14} />}>
                  Sent Invitations
                </Tabs.Tab>
                <Tabs.Tab
                  value="invitations-received"
                  leftSection={<IconSchool size={14} />}
                  rightSection={
                    pendingAffiliations?.filter(
                      a => a.initiatedBy === 'university' && a.userId === user?.id,
                    ).length > 0 ? (
                      <Badge size="sm" color="red">
                        {
                          pendingAffiliations.filter(
                            a => a.initiatedBy === 'university' && a.userId === user?.id,
                          ).length
                        }
                      </Badge>
                    ) : null
                  }
                >
                  Invitations Received
                </Tabs.Tab>
                <Tabs.Tab
                  value="university-join-requests"
                  leftSection={<IconSchool size={14} />}
                  rightSection={
                    pendingJoinRequests?.length > 0 ? (
                      <Badge size="sm" color="red">
                        {pendingJoinRequests.length}
                      </Badge>
                    ) : null
                  }
                >
                  University Join Requests
                </Tabs.Tab>
                <Tabs.Tab value="add-student" leftSection={<IconUserPlus size={14} />}>
                  Add Student
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="students">
                <Box mb="xl">
                  <Title order={4} mb="md">
                    Add Student
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
                      <Button type="submit">Invite Student</Button>
                    </Group>
                  </form>
                </Box>

                <Title order={4} mb="md">
                  Affiliated Students
                </Title>
                {!university.affiliations ||
                university.affiliations.filter(a => a.status === 'active').length === 0 ? (
                  <Text c="dimmed">No students affiliated yet.</Text>
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Username</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {university.affiliations
                        .filter(a => a.status === 'active')
                        .map(affiliation => (
                          <Table.Tr key={affiliation.id}>
                            <Table.Td>{affiliation.user.username}</Table.Td>
                            <Table.Td>{affiliation.user.email}</Table.Td>
                            <Table.Td>Active</Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="join-requests" pt="md">
                {renderStudentJoinRequests()}
              </Tabs.Panel>

              <Tabs.Panel value="sent-invitations" pt="md">
                {renderPendingInvitations()}
              </Tabs.Panel>

              <Tabs.Panel value="invitations-received" pt="md">
                {renderInvitationsReceived()}
              </Tabs.Panel>

              <Tabs.Panel value="university-join-requests" pt="md">
                {renderUniversityJoinRequests()}
              </Tabs.Panel>

              <Tabs.Panel value="add-student" pt="md">
                {renderAddStudentForm()}
              </Tabs.Panel>
            </Tabs>

            <Modal
              opened={registerModalOpened}
              onClose={closeRegisterModal}
              title="Register New Student"
              styles={modalStyles}
              centered
            >
              <form onSubmit={registerStudentForm.onSubmit(handleRegisterStudent)}>
                <TextInput
                  label="Email"
                  required
                  placeholder="student@example.com"
                  mb="md"
                  {...registerStudentForm.getInputProps('email')}
                />

                <TextInput
                  label="Username"
                  required
                  placeholder="student_username"
                  mb="md"
                  {...registerStudentForm.getInputProps('username')}
                />

                <PasswordInput
                  label="Password"
                  required
                  placeholder="Must be at least 8 characters"
                  mb="xl"
                  {...registerStudentForm.getInputProps('password')}
                />

                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge color="green">Auto-affiliated</Badge>
                    <Text size="sm">with {university.displayName}</Text>
                  </Group>
                  <Group>
                    <Button variant="subtle" onClick={closeRegisterModal}>
                      Cancel
                    </Button>
                    <Button type="submit">Register Student</Button>
                  </Group>
                </Group>
              </form>
            </Modal>

            <Modal
              opened={csvModalOpened}
              onClose={closeCsvModal}
              title="Batch Register Students"
              styles={modalStyles}
              centered
            >
              <Text mb="md">
                Upload a CSV file with student information to register multiple students at once.
              </Text>

              <Box
                mb="xl"
                p="md"
                style={{ border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}
              >
                <IconSend size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <Text>CSV Upload Feature Coming Soon</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  The CSV should contain columns for email, username, and password
                </Text>
              </Box>

              <Divider my="md" />

              <Group justify="flex-end">
                <Button variant="subtle" onClick={closeCsvModal}>
                  Cancel
                </Button>
                <Button onClick={handleCsvUpload}>Submit</Button>
              </Group>
            </Modal>
          </>
        )}
      </Box>
    </Container>
  );
}
