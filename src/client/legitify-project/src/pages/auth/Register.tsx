import { register } from '@/api/auth/auth.api';
import { Issuer } from '@/api/issuers/issuer.models';
import { UserRole } from '@/api/users/user.models';
import { AuthPageBackground } from '@/components/AuthPageBackground';
import { StatusIndicator } from '@/components/StatusIndicator';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  LoadingOverlay,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconLock,
  IconLockCheck,
  IconMail,
  IconSend,
  IconUser,
} from '@tabler/icons-react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Define form values interface
interface FormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  country: string;
  organizationName: string;
  issuerName: string;
  issuerDisplayName: string;
  issuerDescription: string;
  termsAccepted: boolean;
  provideOrgInfoLater: boolean;
  joinIssuerId: string;
  issuerAction: 'create' | 'join' | 'skip';
}

const Register = () => {
  const [active, setActive] = useState(0);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [isLoadingIssuers, setIsLoadingIssuers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDarkMode } = useTheme();

  const form = useForm<FormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'holder',
      country: '',
      organizationName: '',
      issuerName: '',
      issuerDisplayName: '',
      issuerDescription: '',
      termsAccepted: false,
      provideOrgInfoLater: false,
      joinIssuerId: '',
      issuerAction: 'create', // Default to create
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Passwords do not match',
    },
  });

  useEffect(() => {
    if (
      active === 1 &&
      (form.values.role === 'holder' ||
        (form.values.role === 'issuer' && form.values.issuerAction === 'join'))
    ) {
      const fetchIssuers = async () => {
        try {
          setIsLoadingIssuers(true);
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await axios.get(`${baseUrl}/issuer/all`);
          setIssuers(response.data);
        } catch (error) {
          console.error('Error fetching issuers:', error);
          setError('Failed to load issuers. Please try again.');
        } finally {
          setIsLoadingIssuers(false);
        }
      };
      fetchIssuers();
    }
  }, [form.values.role, form.values.issuerAction, active]);

  const nextStep = () => {
    form.validate();
    if (!form.isValid()) return;

    if (active < 1) {
      setActive(current => current + 1);
    }
  };

  const prevStep = () => {
    setActive(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      let registrationData: any = {
        email: form.values.email,
        password: form.values.password,
        username: form.values.username,
        role: form.values.role,
        country: form.values.country,
      };

      // Add role-specific data
      if (form.values.role === 'issuer') {
        if (form.values.issuerAction === 'create') {
          // Create new issuer
          registrationData.issuerName = form.values.issuerName;
          registrationData.issuerDisplayName = form.values.issuerDisplayName;
          registrationData.issuerDescription = form.values.issuerDescription;
        } else if (form.values.issuerAction === 'join' && form.values.joinIssuerId) {
          // Issuer joining existing issuer
          registrationData.joinIssuerId = form.values.joinIssuerId;
        }
        // If issuerAction is 'skip', we don't add any issuer data
      } else if (form.values.role === 'verifier') {
        // Verifier data
        registrationData.orgName = form.values.organizationName;
      }

      // For holders joining an issuer - convert to expected array format
      if (form.values.role === 'holder' && form.values.joinIssuerId) {
        registrationData.issuerIds = [form.values.joinIssuerId];
      }

      // Register the user
      await register(registrationData);

      // AUTO-LOGIN - Log the user in automatically after registration
      await login(form.values.email, form.values.password);

      // Navigate to dashboard instead of login page
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setIsLoading(false);
    }
  };

  const isStep1Valid = () => {
    const { username, email, password, confirmPassword } = form.values;
    return (
      username.trim() !== '' &&
      email.trim() !== '' &&
      password.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      password === confirmPassword
    );
  };

  const isStep2Valid = () => {
    const {
      role,
      country,
      termsAccepted,
      issuerName,
      issuerDisplayName,
      issuerAction,
      joinIssuerId,
    } = form.values;

    // Basic validation that applies to all roles
    const basicValid = !!role && country !== '' && termsAccepted;

    // Additional validation for issuer role
    if (role === 'issuer') {
      if (issuerAction === 'create') {
        return basicValid && !!issuerName && !!issuerDisplayName;
      } else if (issuerAction === 'join') {
        return basicValid && !!joinIssuerId;
      } else if (issuerAction === 'skip') {
        return basicValid; // Only basic validation required if skipping
      }
    }

    return basicValid;
  };

  const renderFormStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <SimpleGrid cols={1} mt="xl">
            <TextInput
              label="Username"
              placeholder="Username"
              required
              leftSection={<IconUser size={16} className="accent-icon" />}
              {...form.getInputProps('username')}
            />
            <TextInput
              label="Email"
              placeholder="Email"
              required
              leftSection={<IconMail size={16} className="accent-icon" />}
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Password"
              placeholder="Password"
              required
              leftSection={<IconLock size={16} className="accent-icon" />}
              {...form.getInputProps('password')}
            />
            <PasswordInput
              mt="md"
              required
              label="Confirm password"
              placeholder="Confirm password"
              leftSection={<IconLockCheck size={16} className="accent-icon" />}
              {...form.getInputProps('confirmPassword')}
            />
            <SegmentedControl
              mt="md"
              value={form.values.role}
              onChange={value =>
                form.setFieldValue('role', value as 'holder' | 'issuer' | 'verifier')
              }
              data={[
                { value: 'holder', label: 'Holder' },
                { value: 'verifier', label: 'Verifier' },
                { value: 'issuer', label: 'Issuer' },
              ]}
              fullWidth
              className="orange-segment"
            />
          </SimpleGrid>
        );
      case 1:
        return (
          <>
            <SimpleGrid cols={1} mt="xl">
              <Select
                required
                label="Country"
                placeholder="Select your country"
                data={[
                  { value: 'us', label: 'United States' },
                  { value: 'uk', label: 'United Kingdom' },
                  { value: 'ie', label: 'Ireland' },
                ]}
                searchable
                {...form.getInputProps('country')}
              />

              {form.values.role === 'verifier' && (
                <TextInput
                  label="Organization Name (Optional)"
                  placeholder="Organization Name"
                  {...form.getInputProps('organizationName')}
                />
              )}

              {form.values.role === 'issuer' && (
                <>
                  <Box mb="md">
                    <Text fw={500} mb="xs">
                      Issuer Organization
                    </Text>
                    <Group grow mb="xs">
                      <Button
                        variant={form.values.issuerAction === 'create' ? 'filled' : 'light'}
                        onClick={() => form.setFieldValue('issuerAction', 'create')}
                      >
                        Create New Issuer
                      </Button>
                      <Button
                        variant={form.values.issuerAction === 'join' ? 'filled' : 'light'}
                        onClick={() => form.setFieldValue('issuerAction', 'join')}
                      >
                        Join Existing Issuer
                      </Button>
                    </Group>
                    <Button
                      variant="subtle"
                      fullWidth
                      onClick={() => {
                        form.setFieldValue('issuerAction', 'skip');
                        form.setFieldValue('issuerName', '');
                        form.setFieldValue('issuerDisplayName', '');
                        form.setFieldValue('issuerDescription', '');
                        form.setFieldValue('joinIssuerId', '');
                      }}
                    >
                      I'll create or join an issuer later from my dashboard
                    </Button>
                  </Box>

                  {form.values.issuerAction === 'create' && (
                    <>
                      <TextInput
                        label="Issuer Name"
                        placeholder="Full name (e.g., Dublin City University)"
                        required
                        mt="md"
                        {...form.getInputProps('issuerName')}
                      />
                      <TextInput
                        label="Short Name"
                        placeholder="Abbreviation (e.g., DCU)"
                        required
                        mt="md"
                        {...form.getInputProps('issuerDisplayName')}
                      />
                      <TextInput
                        label="Description"
                        placeholder="Brief description of the issuer"
                        mt="md"
                        {...form.getInputProps('issuerDescription')}
                      />
                    </>
                  )}

                  {form.values.issuerAction === 'join' && (
                    <Select
                      label="Join an Issuer"
                      description="Request to join an existing issuer"
                      placeholder={isLoadingIssuers ? 'Loading issuers...' : 'Select an issuer'}
                      data={issuers.map(issuer => ({
                        value: issuer.id,
                        label: `${issuer.name} (${issuer.shorthand})`,
                      }))}
                      searchable
                      clearable
                      required
                      mt="md"
                      disabled={isLoadingIssuers}
                      {...form.getInputProps('joinIssuerId')}
                    />
                  )}
                </>
              )}

              {form.values.role === 'holder' && (
                <Select
                  label="Join an Issuer (Optional)"
                  description="Request to join an existing issuer"
                  placeholder={isLoadingIssuers ? 'Loading issuers...' : 'Select an issuer'}
                  data={issuers.map(issuer => ({
                    value: issuer.id,
                    label: `${issuer.name} (${issuer.shorthand})`,
                  }))}
                  searchable
                  clearable
                  mt="md"
                  disabled={isLoadingIssuers}
                  {...form.getInputProps('joinIssuerId')}
                />
              )}

              <Checkbox
                mt="xl"
                label="I accept the terms and conditions"
                {...form.getInputProps('termsAccepted', { type: 'checkbox' })}
              />
            </SimpleGrid>
          </>
        );
      default:
        return null;
    }
  };

  const cardStyle = {
    maxWidth: 550,
    width: '100%',
    position: 'relative' as const,
    backdropFilter: 'blur(10px)',
    backgroundColor: isDarkMode ? 'rgba(42, 45, 54, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    borderColor: isDarkMode ? 'rgba(63, 67, 86, 0.7)' : 'rgba(234, 236, 239, 0.7)',
    transition: 'all 0.3s ease',
    animationName: 'cardAppear',
    animationDuration: '0.6s',
    animationFillMode: 'forwards',
    animationTimingFunction: 'ease-out',
    margin: '1rem auto',
  };

  return (
    <AuthPageBackground>
      <Card
        shadow="lg"
        padding="xl"
        radius="lg"
        withBorder
        className="accent-top-card"
        style={cardStyle}
      >
        <LoadingOverlay visible={isLoading} />

        <Title order={2} ta="center" mb="sm" className="accent-gradient-text">
          Join LegiTify
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="xl">
          Create your account to start using the platform
        </Text>

        <Stepper active={active} onStepClick={setActive} mb="xl">
          <Stepper.Step label="Account Info" description="Basic details" />
          <Stepper.Step label="Organization" description="Role-specific info" />
        </Stepper>

        {error && (
          <Alert
            color="red"
            mb="md"
            radius="md"
            icon={<IconAlertCircle size={16} />}
            title="Registration Error"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          {renderFormStep(active)}

          <Group justify="center" mt="xl">
            {active > 0 && (
              <Button
                variant="light"
                onClick={prevStep}
                leftSection={<IconArrowLeft size={14} />}
                className="accent-secondary-button"
              >
                Back
              </Button>
            )}
            {active === 0 ? (
              <Button
                onClick={nextStep}
                disabled={!isStep1Valid()}
                rightSection={<IconArrowRight size={14} />}
                className="accent-button"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!isStep2Valid()}
                className="accent-button"
                rightSection={<IconSend size={14} />}
              >
                Register
              </Button>
            )}
          </Group>
        </form>

        <Text mt="md" ta="center" size="sm">
          Already have an account?{' '}
          <Anchor href="/login" fw={700} className="accent-link">
            Login
          </Anchor>
        </Text>
      </Card>

      <StatusIndicator position="bottom-right" />
    </AuthPageBackground>
  );
};

export default Register;
