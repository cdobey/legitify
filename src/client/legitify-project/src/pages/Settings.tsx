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
  Group,
  Image,
  Modal,
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
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconBadge,
  IconCheck,
  IconCloudUpload,
  IconFingerprint,
  IconLock,
  IconMoonStars,
  IconPhoto,
  IconShield,
  IconSun,
  IconTrash,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import {
  useAccessibleDegreesQuery,
  useAccessRequestsQuery,
  useLedgerRecordsQuery,
  useMyDegreesQuery,
} from '../api/degrees/degree.queries';
import {
  useChangePasswordMutation,
  useDeleteProfilePictureMutation,
  useDisableTwoFactorMutation,
  useEnableTwoFactorMutation,
  useUpdateProfileMutation,
  useUploadProfilePictureMutation,
  useVerifyTwoFactorMutation,
} from '../api/users/user.mutations';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from './StatCard';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { isDarkMode, setLightTheme, setDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoModalOpened, { open: openLogoModal, close: closeLogoModal }] = useDisclosure(false);
  const [
    profilePictureModalOpened,
    { open: openProfilePictureModal, close: closeProfilePictureModal },
  ] = useDisclosure(false);

  const openProfilePictureModalWithCurrentImage = () => {
    if (user?.profilePictureUrl) {
    }
    openProfilePictureModal();
  };

  const openLogoModalWithCurrentImage = () => {
    openLogoModal();
  };

  // 2FA states
  const [twoFactorSetupOpened, { open: openTwoFactorSetup, close: closeTwoFactorSetup }] =
    useDisclosure(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorVerificationCode, setTwoFactorVerificationCode] = useState('');
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');

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

  // Mutations
  const uploadLogoMutation = useUploadUniversityLogoMutation();
  const deleteLogoMutation = useDeleteUniversityLogoMutation();
  const uploadProfilePictureMutation = useUploadProfilePictureMutation();
  const deleteProfilePictureMutation = useDeleteProfilePictureMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const enableTwoFactorMutation = useEnableTwoFactorMutation();
  const verifyTwoFactorMutation = useVerifyTwoFactorMutation();
  const disableTwoFactorMutation = useDisableTwoFactorMutation();

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
      username: value => (value.length < 2 ? 'Username must be at least 2 characters' : null),
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
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
        value.length < 6 ? 'Current password must be at least 6 characters' : null,
      newPassword: value => (value.length < 8 ? 'Password must be at least 8 characters' : null),
      confirmPassword: (value, values) =>
        value !== values.newPassword ? 'Passwords do not match' : null,
    },
  });

  // Effect to reset form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.setValues({
        username: user.username,
        email: user.email,
      });
    }
  }, [user]);

  // Handle profile update
  const handleProfileUpdate = async (values: typeof profileForm.values) => {
    // Only submit changed values
    const changedValues: { username?: string; email?: string } = {};
    if (values.username !== user?.username) {
      changedValues.username = values.username;
    }
    if (values.email !== user?.email) {
      changedValues.email = values.email;
    }

    if (Object.keys(changedValues).length === 0) {
      notifications.show({
        title: 'No Changes',
        message: "You haven't made any changes to your profile.",
        color: 'blue',
      });
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(changedValues);
      notifications.show({
        title: 'Profile Updated',
        message: 'Your profile information has been updated successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      notifications.show({
        title: 'Update Failed',
        message: error.message || 'Failed to update profile. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  // Handle password change
  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      notifications.show({
        title: 'Password Changed',
        message: 'Your password has been changed successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      passwordForm.reset();
    } catch (error: any) {
      notifications.show({
        title: 'Password Change Failed',
        message: error.message || 'Failed to change password. Please try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const handleLogoUpload = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!logoFile) {
        setError('No file selected');
        return;
      }

      if (logoFile.size > 2 * 1024 * 1024) {
        setError('Logo must be less than 2MB');
        return;
      }

      if (!university) {
        setError('No university found');
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
      setError(null);
      setSuccess(null);

      if (!university) {
        setError('No university found');
        return;
      }

      if (!university.logoUrl) {
        setError('No logo found to delete');
        return;
      }

      await deleteLogoMutation.mutateAsync(university.id);
      notifications.show({
        title: 'Success',
        message: 'University logo deleted successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setSuccess('University logo deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete logo:', err);
      setError(err.message || 'Failed to delete university logo');
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to delete university logo',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!profilePictureFile) {
        setError('No file selected');
        return;
      }

      if (profilePictureFile.size > 2 * 1024 * 1024) {
        setError('Profile picture must be less than 2MB');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(profilePictureFile.type)) {
        setError('Profile picture must be an image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }

      const updatedUser = await uploadProfilePictureMutation.mutateAsync(profilePictureFile);
      setSuccess('Profile picture uploaded successfully');
      setProfilePictureFile(null);
      closeProfilePictureModal();

      // Update the user in context with the new profile picture URL
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setError(err.message || 'Failed to upload profile picture');
    }
  };

  // Handle profile picture delete
  const handleProfilePictureDelete = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!user?.profilePictureUrl) {
        setError('No profile picture found');
        notifications.show({
          title: 'Error',
          message: 'No profile picture found to delete',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
        return;
      }

      await deleteProfilePictureMutation.mutateAsync();
      notifications.show({
        title: 'Success',
        message: 'Profile picture deleted successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setSuccess('Profile picture deleted successfully');

      // Update the user in context
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to delete profile picture:', err);
      setError(err.message || 'Failed to delete profile picture');
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to delete profile picture',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  // Setup 2FA
  const handleSetup2FA = async () => {
    try {
      setError(null);
      const response = await enableTwoFactorMutation.mutateAsync();
      setTwoFactorQrCode(response.qrCode);
      setTwoFactorSecret(response.secret);
      openTwoFactorSetup();
    } catch (err: any) {
      console.error('Failed to setup 2FA:', err);
      setError(err.message || 'Failed to setup two-factor authentication');
    }
  };

  // Verify and enable 2FA
  const handleVerify2FA = async () => {
    try {
      if (!twoFactorSecret) {
        setError('No 2FA secret found');
        return;
      }

      await verifyTwoFactorMutation.mutateAsync({
        secret: twoFactorSecret,
        token: twoFactorVerificationCode,
      });

      setSuccess('Two-factor authentication has been enabled successfully');
      closeTwoFactorSetup();
      setTwoFactorQrCode(null);
      setTwoFactorSecret(null);
      setTwoFactorVerificationCode('');
      refreshUser();
    } catch (err: any) {
      console.error('Failed to verify 2FA:', err);
      setError(err.message || 'Invalid verification code');
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    try {
      await disableTwoFactorMutation.mutateAsync({
        token: twoFactorDisableCode,
      });

      setSuccess('Two-factor authentication has been disabled successfully');
      setTwoFactorDisableCode('');
      refreshUser();
    } catch (err: any) {
      console.error('Failed to disable 2FA:', err);
      setError(err.message || 'Invalid verification code');
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
      <Stack gap="md">
        <Title order={4}>University Logo</Title>
        <Group align="flex-start" wrap="nowrap">
          {university.logoUrl ? (
            <Card withBorder p="xs" style={{ width: '150px', height: '150px' }}>
              <Box
                style={{
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                mb="xs"
              >
                <Image
                  src={university.logoUrl}
                  alt={`${university.displayName} logo`}
                  fit="contain"
                  height={100}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                  }}
                />
              </Box>
              <Group justify="center" style={{ height: '24px' }}>
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconCloudUpload size={14} />}
                  onClick={openLogoModalWithCurrentImage}
                  style={{ padding: '0 8px', height: '24px' }}
                >
                  Update
                </Button>
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleLogoDelete}
                  loading={deleteLogoMutation.isPending}
                  disabled={!university.logoUrl || deleteLogoMutation.isPending}
                  style={{ padding: '0 8px', height: '24px' }}
                >
                  {deleteLogoMutation.isPending ? 'Removing...' : 'Remove'}
                </Button>
              </Group>
            </Card>
          ) : (
            <Card withBorder p="xs" style={{ width: '150px', height: '150px' }}>
              <Box
                style={{
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                mb="xs"
              >
                <IconPhoto size={48} opacity={0.3} />
              </Box>
              <Group justify="center">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconCloudUpload size={14} />}
                  onClick={openLogoModalWithCurrentImage}
                >
                  Upload Logo
                </Button>
              </Group>
            </Card>
          )}

          <Stack style={{ flex: 1 }} gap="xs">
            <Text size="sm">
              Upload your university logo to enhance your branding on certificates and profiles.
            </Text>
            <Text size="xs" c="dimmed">
              The logo should be square and less than 2MB in size. Supported formats: JPEG, PNG,
              GIF, WEBP.
            </Text>
          </Stack>
        </Group>
      </Stack>
    );
  };

  // Role-specific statistics
  const getRoleStats = () => {
    switch (user?.role) {
      case 'individual':
        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StatCard
              title="Your Degrees"
              value={(userDegrees?.length || 0).toString()}
              icon={<IconBadge size={24} />}
            />
            <StatCard
              title="Pending Access Requests"
              value={pendingAccessRequestsCount.toString()}
              icon={<IconUser size={24} />}
            />
          </SimpleGrid>
        );
      case 'university':
        const degreeCount = ledgerRecords?.length || 0;
        return (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <StatCard
              title="Issued Degrees"
              value={degreeCount.toString()}
              icon={<IconBadge size={24} />}
            />
            <StatCard
              title="Last Activity"
              value={degreeCount > 0 ? formatDate(ledgerRecords?.[0]?.issuedAt) : 'N/A'}
              icon={<IconUser size={24} />}
              isDate
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
    <Container size="lg" py="xl">
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

      <Paper shadow="sm" p="xl" withBorder radius="md" mb="lg">
        <Group align="center" mb="md">
          {user.profilePictureUrl ? (
            <Avatar
              size={90}
              radius="50%"
              src={user.profilePictureUrl}
              alt={`${user.username}'s avatar`}
            />
          ) : (
            <Avatar size={90} color="primaryBlue" radius="50%">
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
          )}
          <Stack gap="xs" style={{ flexGrow: 1 }}>
            <Title order={3}>{user.username}</Title>
            <Text c="dimmed">{user.email}</Text>
            <Group mt="xs" gap="xs">
              <Badge color="primaryBlue" variant="light">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <Badge color="teal" variant="light">
                {user.orgName}
              </Badge>
            </Group>
          </Stack>
        </Group>

        {getRoleStats()}
      </Paper>

      <Tabs defaultValue="profile">
        <Tabs.List mb="md">
          <Tabs.Tab value="profile" leftSection={<IconUserCircle size="0.8rem" />}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size="0.8rem" />}>
            Security
          </Tabs.Tab>
          <Tabs.Tab value="preferences" leftSection={<IconSun size="0.8rem" />}>
            Preferences
          </Tabs.Tab>
          {user.role === 'university' && (
            <Tabs.Tab value="university" leftSection={<IconBadge size="0.8rem" />}>
              University
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="profile">
          <Paper shadow="sm" p="xl" withBorder radius="md">
            <Stack gap="xl">
              <Stack gap="md">
                <Title order={4}>Profile Picture</Title>
                <Group align="flex-start" wrap="nowrap">
                  {user.profilePictureUrl ? (
                    <Card withBorder p="xs" style={{ width: '150px', height: '150px' }}>
                      <Box
                        style={{
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        mb="xs"
                      >
                        <Avatar
                          size={90}
                          radius="50%"
                          src={user.profilePictureUrl}
                          alt={`${user.username}'s avatar`}
                          style={{
                            minWidth: '90px',
                            minHeight: '90px',
                            maxWidth: '90px',
                            maxHeight: '90px',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                      <Group justify="center" style={{ height: '24px' }}>
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconCloudUpload size={14} />}
                          onClick={openProfilePictureModalWithCurrentImage}
                          style={{ padding: '0 8px', height: '24px' }}
                        >
                          Update
                        </Button>
                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          leftSection={<IconTrash size={14} />}
                          onClick={handleProfilePictureDelete}
                          loading={deleteProfilePictureMutation.isPending}
                          disabled={deleteProfilePictureMutation.isPending}
                          style={{ padding: '0 8px', height: '24px' }}
                        >
                          {deleteProfilePictureMutation.isPending ? 'Removing...' : 'Remove'}
                        </Button>
                      </Group>
                    </Card>
                  ) : (
                    <Card withBorder p="xs" style={{ width: '150px', height: '150px' }}>
                      <Box
                        style={{
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        mb="xs"
                      >
                        <Avatar size={90} color="primaryBlue" radius="50%">
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                      </Box>
                      <Group justify="center">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconCloudUpload size={14} />}
                          onClick={openProfilePictureModalWithCurrentImage}
                        >
                          Upload
                        </Button>
                      </Group>
                    </Card>
                  )}

                  <Stack style={{ flex: 1 }} gap="xs">
                    <Text size="sm">
                      Your profile picture will be displayed on your profile and in communications.
                    </Text>
                    <Text size="xs" c="dimmed">
                      The image should be square and less than 2MB in size. Supported formats: JPEG,
                      PNG, GIF, WEBP.
                    </Text>
                  </Stack>
                </Group>
              </Stack>

              <Divider />

              <form onSubmit={profileForm.onSubmit(handleProfileUpdate)}>
                <Stack gap="md">
                  <Title order={4}>Profile Information</Title>
                  <TextInput
                    label="Username"
                    placeholder="Your username"
                    {...profileForm.getInputProps('username')}
                  />
                  <TextInput
                    label="Email"
                    placeholder="Your email"
                    {...profileForm.getInputProps('email')}
                    disabled
                    description="Email changes require verification (contact support for assistance)"
                  />
                  <Group justify="flex-start" mt="xs">
                    <Button
                      type="submit"
                      loading={updateProfileMutation.isPending}
                      disabled={!profileForm.isDirty() || updateProfileMutation.isPending}
                    >
                      Update Profile
                    </Button>
                  </Group>
                </Stack>
              </form>

              <Divider />

              <Stack gap="xs">
                <Title order={4}>Account Information</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      Account Type
                    </Text>
                    <Text size="sm">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      Organization
                    </Text>
                    <Text size="sm">{user.orgName}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      Account Created
                    </Text>
                    <Text size="sm">{formatDate(user.createdAt)}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text fw={500} size="sm">
                      Last Updated
                    </Text>
                    <Text size="sm">{formatDate(user.updatedAt)}</Text>
                  </Stack>
                </SimpleGrid>
              </Stack>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security">
          <Paper shadow="sm" p="xl" withBorder radius="md">
            <Stack gap="xl">
              <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
                <Stack gap="md">
                  <Group align="center">
                    <IconLock size={24} />
                    <Title order={4}>Change Password</Title>
                  </Group>
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter your current password"
                    {...passwordForm.getInputProps('currentPassword')}
                  />
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter your new password"
                    {...passwordForm.getInputProps('newPassword')}
                  />
                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm your new password"
                    {...passwordForm.getInputProps('confirmPassword')}
                  />
                  <Group justify="flex-start" mt="xs">
                    <Button
                      type="submit"
                      loading={changePasswordMutation.isPending}
                      disabled={
                        !passwordForm.values.currentPassword ||
                        !passwordForm.values.newPassword ||
                        !passwordForm.values.confirmPassword ||
                        changePasswordMutation.isPending
                      }
                    >
                      Change Password
                    </Button>
                  </Group>
                </Stack>
              </form>

              <Divider />

              <Stack gap="md">
                <Group align="center">
                  <IconFingerprint size={24} />
                  <Title order={4}>Two-Factor Authentication</Title>
                </Group>

                {user.twoFactorEnabled ? (
                  <>
                    <Alert color="teal" title="Two-factor authentication is enabled">
                      Your account is protected with an additional layer of security. When you sign
                      in, you'll need to provide a code from your authenticator app.
                    </Alert>

                    <Group align="center">
                      <PasswordInput
                        label="Authentication Code"
                        placeholder="Enter code from your authenticator app"
                        value={twoFactorDisableCode}
                        onChange={e => setTwoFactorDisableCode(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        color="red"
                        onClick={handleDisable2FA}
                        loading={disableTwoFactorMutation.isPending}
                        disabled={
                          twoFactorDisableCode.length !== 6 || disableTwoFactorMutation.isPending
                        }
                        style={{ marginTop: 26 }}
                      >
                        Disable 2FA
                      </Button>
                    </Group>
                  </>
                ) : (
                  <>
                    <Text size="sm">
                      Two-factor authentication adds an extra layer of security to your account by
                      requiring more than just a password to sign in.
                    </Text>

                    <Button
                      leftSection={<IconShield size={16} />}
                      onClick={handleSetup2FA}
                      loading={enableTwoFactorMutation.isPending}
                    >
                      Setup Two-Factor Authentication
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="preferences">
          <Paper shadow="sm" p="xl" withBorder radius="md">
            <Stack gap="xl">
              <Stack gap="md">
                <Group align="center">
                  {isDarkMode ? <IconMoonStars size={24} /> : <IconSun size={24} />}
                  <Title order={4}>Appearance</Title>
                </Group>

                <Text size="sm">Choose the theme that suits your preference.</Text>

                <Group>
                  <Button
                    variant={isDarkMode ? 'outline' : 'filled'}
                    leftSection={<IconSun size={16} />}
                    onClick={setLightTheme}
                  >
                    Light
                  </Button>
                  <Button
                    variant={!isDarkMode ? 'outline' : 'filled'}
                    leftSection={<IconMoonStars size={16} />}
                    onClick={setDarkTheme}
                  >
                    Dark
                  </Button>
                </Group>
              </Stack>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {user.role === 'university' && (
          <Tabs.Panel value="university">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Stack gap="xl">{renderLogoSection()}</Stack>
            </Paper>
          </Tabs.Panel>
        )}
      </Tabs>

      {/* Profile Picture Modal */}
      <Modal
        opened={profilePictureModalOpened}
        onClose={closeProfilePictureModal}
        title={profilePictureFile ? 'Preview New Profile Picture' : 'Profile Picture'}
        styles={{
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
        }}
        centered
        size="sm"
        withCloseButton
      >
        <Stack gap="md">
          <Text size="sm" c={isDarkMode ? 'dimmed' : 'dark'}>
            {profilePictureFile
              ? 'Preview your new profile picture.'
              : 'Upload a new profile picture or manage your existing one.'}
          </Text>

          <Group justify="center">
            {profilePictureFile ? (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isDarkMode ? '1px solid #373A40' : '1px solid #ced4da',
                }}
              >
                <Image
                  src={URL.createObjectURL(profilePictureFile)}
                  alt="Profile picture preview"
                  fit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            ) : user?.profilePictureUrl ? (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isDarkMode ? '1px solid #373A40' : '1px solid #ced4da',
                }}
              >
                <Image
                  src={user.profilePictureUrl}
                  alt="Current profile picture"
                  fit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            ) : (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  border: isDarkMode ? '2px dashed #373A40' : '2px dashed #ced4da',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1A1B1E' : '#f8f9fa',
                }}
              >
                <IconPhoto size={48} opacity={0.5} color={isDarkMode ? '#5c5f66' : '#adb5bd'} />
              </Box>
            )}
          </Group>

          <Text size="xs" c="dimmed" ta="center">
            Supported formats: JPEG, PNG, GIF, WEBP. Max size: 2MB.
          </Text>

          <Group justify="center">
            <FileButton
              onChange={setProfilePictureFile}
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            >
              {props => (
                <Button
                  {...props}
                  variant="light"
                  size="sm"
                  leftSection={<IconCloudUpload size={16} />}
                >
                  {user?.profilePictureUrl && !profilePictureFile
                    ? 'Choose New Image'
                    : 'Select Image'}
                </Button>
              )}
            </FileButton>

            {profilePictureFile && (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={() => setProfilePictureFile(null)}
              >
                Cancel
              </Button>
            )}

            {user?.profilePictureUrl && !profilePictureFile && (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={handleProfilePictureDelete}
                loading={deleteProfilePictureMutation.isPending}
                disabled={deleteProfilePictureMutation.isPending}
              >
                {deleteProfilePictureMutation.isPending ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </Group>

          {profilePictureFile && (
            <Group justify="center" mt="xs">
              <Button
                disabled={!profilePictureFile || uploadProfilePictureMutation.isPending}
                onClick={handleProfilePictureUpload}
                loading={uploadProfilePictureMutation.isPending}
                size="sm"
              >
                Upload Picture
              </Button>
            </Group>
          )}
        </Stack>
      </Modal>

      {/* Logo Upload Modal */}
      <Modal
        opened={logoModalOpened}
        onClose={closeLogoModal}
        title={logoFile ? 'Preview New Logo' : 'University Logo'}
        styles={{
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
        }}
        centered
        size="sm"
        withCloseButton
      >
        <Stack gap="md">
          <Text size="sm" c={isDarkMode ? 'dimmed' : 'dark'}>
            {logoFile
              ? 'Preview your new university logo.'
              : 'Upload a new logo or manage your existing one.'}
          </Text>

          <Group justify="center">
            {logoFile ? (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isDarkMode ? '1px solid #373A40' : '1px solid #ced4da',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  backgroundColor: isDarkMode ? '#1A1B1E' : '#f8f9fa',
                }}
              >
                <Image
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo preview"
                  fit="contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </Box>
            ) : university?.logoUrl ? (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isDarkMode ? '1px solid #373A40' : '1px solid #ced4da',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  backgroundColor: isDarkMode ? '#1A1B1E' : '#f8f9fa',
                }}
              >
                <Image
                  src={university.logoUrl}
                  alt="Current university logo"
                  fit="contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </Box>
            ) : (
              <Box
                style={{
                  width: '150px',
                  height: '150px',
                  border: isDarkMode ? '2px dashed #373A40' : '2px dashed #ced4da',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1A1B1E' : '#f8f9fa',
                }}
              >
                <IconPhoto size={48} opacity={0.5} color={isDarkMode ? '#5c5f66' : '#adb5bd'} />
              </Box>
            )}
          </Group>

          <Text size="xs" c="dimmed" ta="center">
            Supported formats: JPEG, PNG, GIF, WEBP. Max size: 2MB.
          </Text>

          <Group justify="center">
            <FileButton
              onChange={setLogoFile}
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            >
              {props => (
                <Button
                  {...props}
                  variant="light"
                  size="sm"
                  leftSection={<IconCloudUpload size={16} />}
                >
                  {university?.logoUrl && !logoFile ? 'Choose New Logo' : 'Select Image'}
                </Button>
              )}
            </FileButton>

            {logoFile && (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={() => setLogoFile(null)}
              >
                Cancel
              </Button>
            )}

            {university?.logoUrl && !logoFile && (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                onClick={handleLogoDelete}
                loading={deleteLogoMutation.isPending}
                disabled={deleteLogoMutation.isPending}
              >
                {deleteLogoMutation.isPending ? 'Removing...' : 'Remove'}
              </Button>
            )}
          </Group>

          {logoFile && (
            <Group justify="center" mt="xs">
              <Button
                disabled={!logoFile || uploadLogoMutation.isPending}
                onClick={handleLogoUpload}
                loading={uploadLogoMutation.isPending}
                size="sm"
              >
                Upload Logo
              </Button>
            </Group>
          )}
        </Stack>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        opened={twoFactorSetupOpened}
        onClose={closeTwoFactorSetup}
        title="Set Up Two-Factor Authentication"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Scan this QR code with your authenticator app (like Google Authenticator, Authy, or
            Microsoft Authenticator).
          </Text>

          {twoFactorQrCode && (
            <Box mx="auto" my="md" p="md" style={{ textAlign: 'center' }}>
              <img
                src={twoFactorQrCode}
                alt="Two-factor authentication QR code"
                style={{ maxWidth: '100%' }}
              />
            </Box>
          )}

          {twoFactorSecret && (
            <Text size="sm" ta="center" fw={500}>
              Manual entry key: {twoFactorSecret}
            </Text>
          )}

          <Divider my="sm" />

          <Text size="sm" fw={500}>
            Enter the 6-digit code from your authenticator app to verify setup:
          </Text>

          <TextInput
            placeholder="Enter 6-digit code"
            value={twoFactorVerificationCode}
            onChange={e => setTwoFactorVerificationCode(e.target.value)}
            maxLength={6}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeTwoFactorSetup}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify2FA}
              disabled={twoFactorVerificationCode.length !== 6}
              loading={verifyTwoFactorMutation.isPending}
            >
              Verify and Enable
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
