import {
  useAccessRequestsQuery,
  useAccessibleDegreesQuery,
  useLedgerRecordsQuery,
  useMyDegreesQuery,
} from '@/api/degrees/degree.queries';
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
  Grid,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBadge,
  IconCheck,
  IconLock,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('profile');

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
      // Here you would implement the API call to update the user profile
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));

      notifications.show({
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Refresh user data after update
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
      // Here you would implement the API call to change the password
      // For now, we'll just simulate a successful update
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

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        // Count issued degrees from ledger records
        const issuedDegreesCount = ledgerRecords?.length || 0;

        // Get student count from university affiliations
        const university = universities?.[0];
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
        // Get real count of accessible degrees
        const accessibleDegreesCount = accessibleDegrees?.length || 0;

        // Calculate number of unique individuals (credential owners)
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

      <Paper shadow="xs" withBorder>
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
