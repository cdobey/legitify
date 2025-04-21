import { register } from '@/api/auth/auth.api';
import { Issuer } from '@/api/issuers/issuer.models';
import { UserRole } from '@/api/users/user.models';
import { StatusIndicator } from '@/components/StatusIndicator';
import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  LoadingOverlay,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stepper,
  Switch,
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
}

const Register = () => {
  const [active, setActive] = useState(0);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [isLoadingIssuers, setIsLoadingIssuers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

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
    if (active === 1 && form.values.role === 'holder') {
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
  }, [form.values.role, active]);

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
      };

      // Add role-specific data
      if (form.values.role === 'issuer' && !form.values.provideOrgInfoLater) {
        registrationData.issuerName = form.values.issuerName;
        registrationData.issuerDisplayName = form.values.issuerDisplayName;
        registrationData.issuerDescription = form.values.issuerDescription;
      } else if (form.values.role === 'verifier') {
        registrationData.orgName = form.values.organizationName;
      }

      // Add issuer join request for holders
      if (form.values.role === 'holder' && form.values.joinIssuerId) {
        registrationData.joinIssuerId = form.values.joinIssuerId;
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
    const { role, country, termsAccepted, issuerName, issuerDisplayName, provideOrgInfoLater } =
      form.values;

    // Basic validation that applies to all roles
    const basicValid = !!role && country !== '' && termsAccepted;

    // Additional validation for issuer role when not choosing to provide info later
    if (role === 'issuer' && !provideOrgInfoLater) {
      return basicValid && !!issuerName && !!issuerDisplayName;
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
                  <Switch
                    label="I'll provide issuer information later"
                    checked={form.values.provideOrgInfoLater}
                    onChange={event =>
                      form.setFieldValue('provideOrgInfoLater', event.currentTarget.checked)
                    }
                    mt="md"
                  />

                  {!form.values.provideOrgInfoLater && (
                    <>
                      <TextInput
                        label="Issuer Name"
                        placeholder="Official issuer name"
                        required
                        mt="md"
                        {...form.getInputProps('issuerName')}
                      />
                      <TextInput
                        label="Display Name"
                        placeholder="Name to display to users"
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
                </>
              )}

              {form.values.role === 'holder' && (
                <Select
                  label="Join a Issuer (Optional)"
                  description="Request to join an existing issuer"
                  placeholder={isLoadingIssuers ? 'Loading issuers...' : 'Select a issuer'}
                  data={issuers.map(uni => ({
                    value: uni.id,
                    label: uni.shorthand || uni.name,
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

  return (
    <Container size="xs" py="xl">
      <Card
        shadow="md"
        padding="xl"
        radius="lg"
        withBorder
        className="accent-top-card"
        style={{ maxWidth: 600, margin: '0 auto' }}
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
    </Container>
  );
};

export default Register;
