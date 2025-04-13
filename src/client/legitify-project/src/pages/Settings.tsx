import {
  useAccessRequestsQuery,
  useAccessibleDegreesQuery,
  useLedgerRecordsQuery,
  useMyDegreesQuery,
} from '@/api/degrees/degree.queries';
import {
  useDeleteUniversityLogoMutation,
  useUploadUniversityLogoMutation,
} from '@/api/universities/university.mutations';
import { useMyUniversitiesQuery } from '@/api/universities/university.queries';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  FileButton,
  Grid,
  Group,
  Image,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBadge,
  IconCheck,
  IconCloudUpload,
  IconLock,
  IconMoonStars,
  IconPhoto,
  IconSettings,
  IconSun,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('profile');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoModalOpened, { open: openLogoModal, close: closeLogoModal }] = useDisclosure(false);

  const { data: userDegrees } = useMyDegreesQuery({ enabled: user?.role === 'individual' });
  const { data: accessRequests } = useAccessRequestsQuery({ enabled: user?.role === 'individual' });
  const { data: ledgerRecords } = useLedgerRecordsQuery({
    enabled: user?.role === 'university',
  });
  const { data: universities } = useMyUniversitiesQuery({
    enabled: user?.role === 'university',
  });
  const { data: accessibleDegrees } = useAccessibleDegreesQuery({
    enabled: user?.role === 'employer',
  });

  // Logo management mutations
  const uploadLogoMutation = useUploadUniversityLogoMutation();
  const deleteLogoMutation = useDeleteUniversityLogoMutation();

  // Get the university for university users
  const university = universities?.[0];

  const pendingAccessRequestsCount =
    accessRequests?.filter(request => request.status === 'pending').length ?? 0;

  // Profile form
  const profileForm = useForm({
    initialValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length < 3 ? 'Username must be at least 3 characters' : null),
    },
  });

  // Password form
  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      currentPassword: value =>
        value.length < 6 ? 'Password must be at least 6 characters' : null,
      newPassword: value => (value.length < 6 ? 'Password must be at least 6 characters' : null),
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Passwords do not match' : null,
    },
  });

  // Handle profile update
  const handleProfileUpdate = async (values: typeof profileForm.values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      notifications.show({
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      await refreshUser();
    } catch (error) {
      notifications.show({
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      notifications.show({
        title: 'Password Changed',
        message: 'Your password has been changed successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      passwordForm.reset();
    } catch (error) {
      notifications.show({
        title: 'Password Change Failed',
        message: 'Failed to change password. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!university) {
        setError('No university found');
        return;
      }

      if (!logoFile) {
        setError('No file selected');
        return;
      }

      if (logoFile.size > 2 * 1024 * 1024) {
        setError('Logo file must be less than 2MB');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(logoFile.type)) {
        setError('Logo must be an image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }

      await uploadLogoMutation.mutateAsync({
        universityId: university.id,
        logoFile,
      });

      setSuccess('University logo uploaded successfully');
      setLogoFile(null);
      closeLogoModal();
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setError(err.message || 'Failed to upload university logo');
    }
  };

  // Handle logo delete
  const handleLogoDelete = async () => {
    try {
      if (!university) {
        setError('No university found');
        return;
      }

      await deleteLogoMutation.mutateAsync(university.id);
      setSuccess('University logo deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete logo:', err);
      setError(err.message || 'Failed to delete university logo');
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Logo management section for university users
  const renderLogoSection = () => {
    if (!university) return null;

    return (
      <Paper shadow="xs" withBorder p="md" mt="md">
        <Title order={4} mb="lg">
          University Logo
        </Title>
        <Group align="flex-start">
          {university.logoUrl ? (
            <Card withBorder p="md" style={{ width: '200px', height: '200px' }}>
              <Image
                src={university.logoUrl}
                alt={`${university.displayName} logo`}
                fit="contain"
                height={140}
                mb="xs"
              />
              <Group justify="center">
                <Button
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  variant="outline"
                  size="xs"
                  onClick={handleLogoDelete}
                  loading={deleteLogoMutation.isPending}
                >
                  Remove Logo
                </Button>
              </Group>
            </Card>
          ) : (
            <Card withBorder p="md" style={{ width: '200px', height: '200px' }}>
              <Group justify="center" style={{ height: '140px' }} mb="xs">
                <IconPhoto size={64} opacity={0.3} />
              </Group>
              <Group justify="center">
                <Text size="sm" c="dimmed">
                  No logo uploaded
                </Text>
              </Group>
            </Card>
          )}

          <Box>
            <Text size="sm" mb="md">
              Upload a logo for your university. This logo will be displayed on certificates and
              when employers verify degrees issued by your university.
            </Text>
            <Button
              leftSection={<IconCloudUpload size={16} />}
              onClick={openLogoModal}
              disabled={uploadLogoMutation.isPending}
            >
              {university.logoUrl ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </Box>
        </Group>
      </Paper>
    );
  };

  // Role-specific stats (placeholder)
  const getRoleStats = () => {
    if (!user) return null;

    switch (user.role) {
      case 'individual':
        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StatCard
              title="My Degrees"
              value={userDegrees?.length.toString() || '0'}
              icon={<IconBadge size={24} />}
            />
            <StatCard
              title="Pending Requests"
              value={pendingAccessRequestsCount.toString()}
              icon={<IconAlertCircle size={24} />}
            />
          </SimpleGrid>
        );
      case 'university':
        const issuedDegreesCount = ledgerRecords?.length || 0;
        const studentsCount =
          university?.affiliations?.filter(a => a.status === 'active')?.length || 0;

        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StatCard
              title="Issued Degrees"
              value={issuedDegreesCount.toString()}
              icon={<IconBadge size={24} />}
            />
            <StatCard
              title="Students"
              value={studentsCount.toString()}
              icon={<IconUser size={24} />}
            />
          </SimpleGrid>
        );
      case 'employer':
        const accessibleDegreesCount = accessibleDegrees?.length || 0;
        const uniqueIndividuals = new Set(
          accessibleDegrees?.map(degree => degree.owner?.email) || [],
        ).size;

        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StatCard
              title="Unique Individuals"
              value={uniqueIndividuals.toString()}
              icon={<IconUser size={24} />}
            />
            <StatCard
              title="Accessible Degrees"
              value={accessibleDegreesCount.toString()}
              icon={<IconBadge size={24} />}
            />
          </SimpleGrid>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Not Authenticated">
          You need to be logged in to access your settings.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
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

      <Paper shadow="xs" p="md" withBorder radius="md" mb="xl">
        <Group align="flex-start" mb="md">
          <Avatar
            size={80}
            color="primaryBlue"
            radius="xl"
            style={{ border: '2px solid var(--mantine-color-primaryBlue-6)' }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>

          <Box>
            <Text fw={700} size="xl">
              {user.username}
            </Text>
            <Text c="dimmed">{user.email}</Text>
            <Group mt="xs">
              <Badge color="primaryBlue">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <Badge color="green">{user.orgName}</Badge>
            </Group>
          </Box>
        </Group>

        {getRoleStats()}
      </Paper>

      {user.role === 'university' && renderLogoSection()}

      <Paper shadow="xs" withBorder mt="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
              Profile Information
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Account Settings
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
              Security
            </Tabs.Tab>
          </Tabs.List>

          <Box p="md">
            <Tabs.Panel value="profile">
              <Stack>
                <Title order={4}>Account Details</Title>
                <Divider />

                <Grid>
                  <Grid.Col span={4}>
                    <Text fw={500}>Username</Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text>{user.username}</Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text fw={500}>Email</Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text>{user.email}</Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text fw={500}>Role</Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text fw={500}>Organization</Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text>{user.orgName}</Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text fw={500}>Member Since</Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text>{formatDate(user.createdAt)}</Text>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="settings">
              <form onSubmit={profileForm.onSubmit(handleProfileUpdate)}>
                <Stack>
                  <Title order={4}>Edit Profile</Title>
                  <Divider />

                  <TextInput
                    label="Username"
                    placeholder="Your username"
                    {...profileForm.getInputProps('username')}
                  />

                  <TextInput
                    label="Email"
                    placeholder="Your email"
                    {...profileForm.getInputProps('email')}
                  />

                  <Divider my="md" />

                  <Title order={5}>Theme Preferences</Title>

                  <Group justify="space-between">
                    <Text>Dark Mode</Text>
                    <Switch
                      checked={isDarkMode}
                      onChange={toggleTheme}
                      size="lg"
                      onLabel={<IconSun size={16} stroke={2.5} />}
                      offLabel={<IconMoonStars size={16} stroke={2.5} />}
                    />
                  </Group>

                  <Button type="submit" loading={loading} mt="md">
                    Update Profile
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            <Tabs.Panel value="security">
              <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
                <Stack>
                  <Title order={4}>Change Password</Title>
                  <Divider />

                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter your current password"
                    {...passwordForm.getInputProps('currentPassword')}
                  />

                  <PasswordInput
                    label="New Password"
                    placeholder="Enter new password"
                    {...passwordForm.getInputProps('newPassword')}
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm new password"
                    {...passwordForm.getInputProps('confirmPassword')}
                  />

                  <Button type="submit" loading={loading} mt="md">
                    Change Password
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Paper>

      {user.role === 'university' && (
        <Modal opened={logoModalOpened} onClose={closeLogoModal} title="Upload University Logo">
          <Text size="sm" mb="md">
            Upload a logo image for your university. The logo should be square and less than 2MB in
            size. Supported formats: JPEG, PNG, GIF, WEBP.
          </Text>

          <Group justify="center" mb="md">
            {logoFile ? (
              <Box style={{ width: '150px', height: '150px', position: 'relative' }}>
                <Image
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo preview"
                  fit="contain"
                  h={150}
                />
              </Box>
            ) : (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPhoto size={48} opacity={0.3} />
              </Box>
            )}
          </Group>

          <Group justify="center" mb="xl">
            <FileButton
              onChange={setLogoFile}
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            >
              {props => (
                <Button {...props} variant="outline">
                  Select image
                </Button>
              )}
            </FileButton>

            {logoFile && (
              <Button variant="outline" color="red" onClick={() => setLogoFile(null)}>
                Remove
              </Button>
            )}
          </Group>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeLogoModal}>
              Cancel
            </Button>
            <Button
              disabled={!logoFile}
              onClick={handleLogoUpload}
              loading={uploadLogoMutation.isPending}
            >
              Upload Logo
            </Button>
          </Group>
        </Modal>
      )}
    </Container>
  );
}

// Helper component for stats cards
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between" align="flex-start">
        <Text fw={500}>{title}</Text>
        {icon}
      </Group>
      <Text size="xl" fw={700} mt="md">
        {value}
      </Text>
    </Card>
  );
}
