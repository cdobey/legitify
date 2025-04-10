import { register } from '@/api/auth/auth.api';
import { UserRole } from '@/api/users/user.models';
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
  IconBriefcase,
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

interface University {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  owner: {
    username: string;
  };
}

// Define registration data type
interface RegistrationData {
  username: string;
  email: string;
  password: string;
  role: string;
  country: string;
  termsAccepted: boolean;
  orgName?: string;
}

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
  universityName: string;
  universityDisplayName: string;
  universityDescription: string;
  termsAccepted: boolean;
  provideOrgInfoLater: boolean;
  joinUniversityId: string;
}

const Register = () => {
  const [active, setActive] = useState(0);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { api, login } = useAuth(); // Make sure login is extracted from useAuth

  // Create a comprehensive form with all fields for both steps
  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'individual' as UserRole,
      country: '',
      organizationName: '',
      universityName: '',
      universityDisplayName: '',
      universityDescription: '',
      termsAccepted: false,
      provideOrgInfoLater: false,
      joinUniversityId: '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Passwords do not match',
    },
  });

  // Fetch universities for individual registration or when joining a university
  useEffect(() => {
    if (active === 1 && form.values.role === 'individual') {
      const fetchUniversities = async () => {
        try {
          setIsLoadingUniversities(true);
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await axios.get(`${baseUrl}/university/all`);
          setUniversities(response.data);
        } catch (error) {
          console.error('Error fetching universities:', error);
          setError('Failed to load universities. Please try again.');
        } finally {
          setIsLoadingUniversities(false);
        }
      };
      fetchUniversities();
    }
  }, [form.values.role, active]);

  const handleRegistration = (data: RegistrationData) => {
    // This function would handle the API call to register the user
    console.log('Registration data:', data);
    // Example: api.post('/auth/register', data)
    //   .then(response => navigate('/auth/login'))
    //   .catch(error => console.error('Registration failed:', error));
  };

  const nextStep = () => {
    if (active === 0) {
      form.validate();
      if (!form.isValid()) return;
    } else if (active === 1) {
      form.validate();
      if (!form.isValid()) return;
    }

    if (active < 1) {
      setActive(current => current + 1);
    } else {
      // Format registration data
      let registrationData: RegistrationData = {
        username: form.values.username,
        email: form.values.email,
        password: form.values.password,
        role: form.values.role,
        country: form.values.country,
        termsAccepted: form.values.termsAccepted,
      };

      // Add role-specific data
      if (form.values.role === 'university' || form.values.role === 'employer') {
        registrationData.orgName = form.values.organizationName;
      }

      // Send registration data
      console.log('Submitting registration:', registrationData);
      handleRegistration(registrationData);
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
      if (form.values.role === 'university' && !form.values.provideOrgInfoLater) {
        registrationData.universityName = form.values.universityName;
        registrationData.universityDisplayName = form.values.universityDisplayName;
        registrationData.universityDescription = form.values.universityDescription;
      } else if (form.values.role === 'employer') {
        registrationData.orgName = form.values.organizationName;
      }

      // Add university join request for individuals
      if (form.values.role === 'individual' && form.values.joinUniversityId) {
        registrationData.joinUniversityId = form.values.joinUniversityId;
      }

      // Register the user
      await register(registrationData);

      // AUTO-LOGIN - Log the user in automatically after registration
      await login(form.values.email, form.values.password);

      // Navigate to dashboard instead of login page
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setIsLoading(false); // Only set loading to false on error
    }
  };

  const isStep1Valid = () => {
    const { username, email, password, confirmPassword, role } = form.values;
    const basicFieldsValid =
      username.trim() !== '' &&
      email.trim() !== '' &&
      password.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      password === confirmPassword;

    return basicFieldsValid;
  };

  const isStep2Valid = () => {
    const {
      role,
      country,
      termsAccepted,
      universityName,
      universityDisplayName,
      provideOrgInfoLater,
    } = form.values;

    // Basic validation that applies to all roles
    const basicValid = !!role && country !== '' && termsAccepted;

    // Additional validation for university role when not choosing to provide info later
    if (role === 'university' && !provideOrgInfoLater) {
      return basicValid && !!universityName && !!universityDisplayName;
    }

    return basicValid;
  };

  // In the renderFormStep function, fix the references to countries and PasswordStrength
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
                form.setFieldValue('role', value as 'individual' | 'university' | 'employer')
              }
              data={[
                { value: 'individual', label: 'Individual' },
                { value: 'employer', label: 'Employer' },
                { value: 'university', label: 'University' },
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
                label="Role"
                placeholder="Select your role"
                data={[
                  { value: 'individual', label: 'Individual' },
                  { value: 'university', label: 'University' },
                  { value: 'employer', label: 'Employer' },
                ]}
                leftSection={<IconBriefcase size={16} className="accent-icon" />}
                {...form.getInputProps('role')}
              />

              <Select
                required
                label="Country"
                placeholder="Select your country"
                data={[
                  { value: 'us', label: 'United States' },
                  { value: 'uk', label: 'United Kingdom' },
                  { value: 'ca', label: 'Canada' },
                  // Add more countries as needed
                ]}
                searchable
                {...form.getInputProps('country')}
              />

              {form.values.role === 'employer' && (
                <TextInput
                  label="Organization Name (Optional)"
                  placeholder="Organization Name"
                  {...form.getInputProps('organizationName')}
                />
              )}

              {form.values.role === 'university' && (
                <>
                  <Switch
                    label="I'll provide university information later"
                    checked={form.values.provideOrgInfoLater}
                    onChange={event =>
                      form.setFieldValue('provideOrgInfoLater', event.currentTarget.checked)
                    }
                    mt="md"
                  />

                  {!form.values.provideOrgInfoLater && (
                    <>
                      <TextInput
                        label="University Name"
                        placeholder="Official university name"
                        required
                        mt="md"
                        {...form.getInputProps('universityName')}
                      />
                      <TextInput
                        label="Display Name"
                        placeholder="Name to display to users"
                        required
                        mt="md"
                        {...form.getInputProps('universityDisplayName')}
                      />
                      <TextInput
                        label="Description"
                        placeholder="Brief description of the university"
                        mt="md"
                        {...form.getInputProps('universityDescription')}
                      />
                    </>
                  )}
                </>
              )}

              {form.values.role === 'individual' && (
                <Select
                  label="Join a University (Optional)"
                  description="Request to join an existing university"
                  placeholder={
                    isLoadingUniversities ? 'Loading universities...' : 'Select a university'
                  }
                  data={universities.map(uni => ({
                    value: uni.id,
                    label: uni.displayName || uni.name,
                  }))}
                  searchable
                  clearable
                  mt="md"
                  disabled={isLoadingUniversities}
                  {...form.getInputProps('joinUniversityId')}
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
    </Container>
  );
};

export default Register;
