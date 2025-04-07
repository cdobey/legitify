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
  IconBuildingBank,
  IconCheck,
  IconPlus,
  IconSchool,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface University {
  id: string;
  name: string;
  displayName: string;
  description: string;
  ownerId: string;
  affiliations: Array<{
    id: string;
    userId: string;
    status: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }>;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allUniversities, setAllUniversities] = useState<University[]>([]);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);
  const [joinModalOpened, { open: openJoinModal, close: closeJoinModal }] = useDisclosure(false);
  const [registerModalOpened, { open: openRegisterModal, close: closeRegisterModal }] =
    useDisclosure(false);
  const [csvModalOpened, { open: openCsvModal, close: closeCsvModal }] = useDisclosure(false);
  const { api, refreshSession } = useAuth();

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

  // Fetch the university associated with the current user
  useEffect(() => {
    const fetchUniversity = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshSession();
        const { data } = await api.get('/university/my');

        if (Array.isArray(data) && data.length > 0) {
          // Ensure affiliations is defined before assigning
          const university = data[0];
          // Add the fallback for affiliations if they're missing
          if (!university.affiliations) {
            university.affiliations = [];
          }
          setUniversity(university);
        } else {
          setError('No university found. Please create one.');
        }
      } catch (err: any) {
        console.error('Failed to fetch university:', err);
        setError(err.message || 'Failed to load university information');
      } finally {
        setLoading(false);
      }
    };

    fetchUniversity();
  }, []);

  // Create a new university
  const handleCreateUniversity = async (values: {
    name: string;
    displayName: string;
    description: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/university/create', values);
      setUniversity(response.data.university);
      setSuccess('University created successfully');
      closeCreateModal();

      // Refresh data
      const { data } = await api.get('/university/my');
      if (Array.isArray(data) && data.length > 0) {
        setUniversity(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to create university:', err);
      setError(err.message || 'Failed to create university');
    } finally {
      setLoading(false);
    }
  };

  // Request to join a university
  const handleJoinUniversity = async (values: { universityId: string }) => {
    try {
      setLoading(true);
      setError(null);

      await api.post('/university/request-join', {
        universityId: values.universityId,
      });

      setSuccess('Join request sent successfully. Waiting for approval.');
      closeJoinModal();
    } catch (err: any) {
      console.error('Failed to send join request:', err);
      setError(err.message || 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all universities for the join modal
  useEffect(() => {
    if (joinModalOpened) {
      const fetchAllUniversities = async () => {
        try {
          const { data } = await api.get('/universities');
          setAllUniversities(data);
        } catch (err: any) {
          console.error('Failed to fetch universities:', err);
        }
      };
      fetchAllUniversities();
    }
  }, [joinModalOpened]);

  // Handle adding a new student to the university
  const handleAddStudent = async (values: NewStudentForm) => {
    try {
      setLoading(true);
      setSuccess(null);
      setError(null);

      if (!university) {
        setError('No university found');
        return;
      }

      await api.post('/university/add-student', {
        universityId: university.id,
        studentEmail: values.email,
      });

      setSuccess(`Invitation sent to ${values.email}`);
      newStudentForm.reset();

      // Refresh university data to get updated affiliations
      const { data } = await api.get('/university/my');
      if (Array.isArray(data) && data.length > 0) {
        setUniversity(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to add student:', err);
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Handle registering a new student directly in the university
  const handleRegisterStudent = async (values: RegisterStudentForm) => {
    try {
      setLoading(true);
      setSuccess(null);
      setError(null);

      if (!university) {
        setError('No university found');
        return;
      }

      await api.post('/university/register-student', {
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

      // Refresh data
      const { data } = await api.get('/university/my');
      if (Array.isArray(data) && data.length > 0) {
        setUniversity(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to register student:', err);
      setError(err.message || 'Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = () => {
    // This is just a placeholder for now
    setSuccess('CSV upload functionality coming soon!');
    closeCsvModal();
  };

  // If no university exists yet, show options to create or join
  if (!loading && !university) {
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

        {/* Create University Modal */}
        <Modal opened={createModalOpened} onClose={closeCreateModal} title="Create University">
          <form onSubmit={createUniversityForm.onSubmit(handleCreateUniversity)}>
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
              <Button type="submit" loading={loading}>
                Create University
              </Button>
            </Group>
          </form>
        </Modal>

        {/* Join University Modal */}
        <Modal opened={joinModalOpened} onClose={closeJoinModal} title="Join University">
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
              <Button type="submit" loading={loading}>
                Send Request
              </Button>
            </Group>
          </form>
        </Modal>
      </Container>
    );
  }

  // If no university exists yet, show message
  if (!loading && !university) {
    return (
      <Container size="lg">
        <Title order={2} mb="xl">
          Manage University
        </Title>
        <Alert icon={<IconAlertCircle size="1rem" />} color="yellow" mb="lg">
          You don't have a university yet. Please contact the administrator.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Box style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        <Title order={2} mb="lg">
          Manage University
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
            <Card withBorder shadow="sm" p="lg" mb="xl">
              <Group mb="md">
                <IconBuildingBank size={24} />
                <Title order={3}>{university.displayName}</Title>
              </Group>

              <Text c="dimmed" mb="lg">
                {university.description}
              </Text>

              <Table>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <strong>Internal ID</strong>
                    </Table.Td>
                    <Table.Td>{university.id}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <strong>Identifier</strong>
                    </Table.Td>
                    <Table.Td>{university.name}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <strong>Students</strong>
                    </Table.Td>
                    <Table.Td>
                      {university.affiliations?.filter(a => a.status === 'active')?.length || 0}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>

            <Tabs defaultValue="students">
              <Tabs.List mb="md">
                <Tabs.Tab value="students" leftSection={<IconUser size={14} />}>
                  Students
                </Tabs.Tab>
                <Tabs.Tab value="pending" leftSection={<IconSchool size={14} />}>
                  Pending Requests
                </Tabs.Tab>
                <Tabs.Tab value="register" leftSection={<IconPlus size={14} />}>
                  Register Students
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

              <Tabs.Panel value="pending">
                <Title order={4} mb="md">
                  Pending Affiliation Requests
                </Title>
                {!university.affiliations ||
                university.affiliations.filter(a => a.status === 'pending').length === 0 ? (
                  <Text c="dimmed">No pending requests.</Text>
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
                        .filter(a => a.status === 'pending')
                        .map(affiliation => (
                          <Table.Tr key={affiliation.id}>
                            <Table.Td>{affiliation.user.username}</Table.Td>
                            <Table.Td>{affiliation.user.email}</Table.Td>
                            <Table.Td>Pending</Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Tabs.Panel>

              <Tabs.Panel value="register">
                <Title order={4} mb="md">
                  Register New Students
                </Title>

                <Group mb="xl">
                  <Button leftSection={<IconPlus size={16} />} onClick={openRegisterModal}>
                    Register Individual Student
                  </Button>
                  <Button
                    leftSection={<IconUpload size={16} />}
                    variant="outline"
                    onClick={openCsvModal}
                  >
                    Batch Upload via CSV
                  </Button>
                </Group>

                <Text c="dimmed" size="sm" mb="md">
                  Students registered directly will be automatically affiliated with your
                  university.
                </Text>
              </Tabs.Panel>
            </Tabs>

            {/* Register Individual Student Modal */}
            <Modal
              opened={registerModalOpened}
              onClose={closeRegisterModal}
              title="Register New Student"
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
                  <Text size="sm">
                    <Badge color="green">Auto-affiliated</Badge> with {university.displayName}
                  </Text>
                  <Group>
                    <Button variant="subtle" onClick={closeRegisterModal}>
                      Cancel
                    </Button>
                    <Button type="submit">Register Student</Button>
                  </Group>
                </Group>
              </form>
            </Modal>

            {/* CSV Upload Modal */}
            <Modal opened={csvModalOpened} onClose={closeCsvModal} title="Batch Register Students">
              <Text mb="md">
                Upload a CSV file with student information to register multiple students at once.
              </Text>

              <Box
                mb="xl"
                p="md"
                style={{ border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center' }}
              >
                <IconUpload size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
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
