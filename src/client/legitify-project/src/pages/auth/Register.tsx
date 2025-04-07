import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  LoadingOverlay,
  MultiSelect,
  PasswordInput,
  Radio,
  Select,
  Stepper,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconAlertCircle,
  IconArrowRight,
  IconAt,
  IconBuildingBank,
  IconDeviceFloppy,
  IconLock,
  IconSchool,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth/auth.api';
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
      email: '',
      password: '',
      passwordConfirm: '',
      username: '',
      role: 'individual' as 'individual' | 'university' | 'employer',
      universityAction: 'create' as 'create' | 'join' | 'later',
      universityName: '',
      universityDisplayName: '',
      universityDescription: '',
      selectedUniversities: [] as string[],
      organizationName: '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      username: value => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
      password: value => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      passwordConfirm: (value, values) =>
        value === values.password ? null : 'Passwords do not match',
    },
  });

  // Fetch universities for individual registration or when joining a university
  useEffect(() => {
    if (
      (form.values.role === 'individual' && active === 1) ||
      (form.values.role === 'university' && form.values.universityAction === 'join' && active === 1)
    ) {
      const fetchUniversities = async () => {
        try {
          setIsLoadingUniversities(true);
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await axios.get(`${baseUrl}/universities`);
          setUniversities(response.data);
        } catch (error) {
          console.error('Failed to fetch universities:', error);
          setError('Failed to load universities. Please try again.');
        } finally {
          setIsLoadingUniversities(false);
        }
      };

      fetchUniversities();
    }
  }, [form.values.role, active, form.values.universityAction]);

  const nextStep = () => setActive(current => current + 1);
  const prevStep = () => setActive(current => Math.max(0, current - 1));

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
      if (form.values.role === 'university') {
        if (form.values.universityAction === 'create') {
          // For university creating a new university, make sure to send the correct fields
          registrationData = {
            ...registrationData,
            universityName: form.values.universityName,
            universityDisplayName: form.values.universityDisplayName,
            universityDescription: form.values.universityDescription,
          };
        } else if (form.values.universityAction === 'join') {
          // For university joining an existing university
          registrationData.joinUniversityId = form.values.selectedUniversities[0]; // Only allow joining one
        }
        // If "later" is selected, no additional data needed
      } else if (form.values.role === 'individual') {
        // For individuals who want to join universities
        if (form.values.selectedUniversities.length > 0) {
          registrationData.universityIds = form.values.selectedUniversities;
        }
      } else if (form.values.role === 'employer') {
        // For employers
        registrationData.orgName = form.values.organizationName;
      }

      // Register the user
      await authApi.register(registrationData);

      // AUTO-LOGIN - Log the user in automatically after registration
      await login(form.values.email, form.values.password);

      // Navigate to dashboard instead of login page
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setIsLoading(false); // Only set loading to false on error
    }
  };

  // Render step 1 content (basic account info)
  const renderStep1 = () => (
    <>
      <TextInput
        label="Email"
        placeholder="your@email.com"
        leftSection={<IconAt size={16} />}
        required
        {...form.getInputProps('email')}
        mb="md"
      />

      <TextInput
        label="Username"
        placeholder="Choose a username"
        leftSection={<IconUser size={16} />}
        required
        {...form.getInputProps('username')}
        mb="md"
      />

      <PasswordInput
        label="Password"
        placeholder="Your password"
        leftSection={<IconLock size={16} />}
        required
        {...form.getInputProps('password')}
        mb="md"
      />

      <PasswordInput
        label="Confirm Password"
        placeholder="Confirm your password"
        leftSection={<IconLock size={16} />}
        required
        {...form.getInputProps('passwordConfirm')}
        mb="md"
      />

      <Select
        label="Role"
        placeholder="Select your role"
        leftSection={<IconUserCircle size={16} />}
        required
        data={[
          { value: 'university', label: 'University' },
          { value: 'individual', label: 'Individual' },
          { value: 'employer', label: 'Employer' },
        ]}
        {...form.getInputProps('role')}
        mb="lg"
      />

      <Group justify="flex-end">
        <Button
          onClick={() => {
            // Validate step 1 fields
            const errors = form.validate();
            if (!errors.hasErrors) {
              nextStep();
            }
          }}
          rightSection={<IconArrowRight size={18} />}
        >
          Next Step
        </Button>
      </Group>
    </>
  );

  // Render step 2 content (role-specific options)
  const renderStep2 = () => {
    if (form.values.role === 'university') {
      return (
        <>
          <Text mb="md">Please select what you would like to do with your university account:</Text>

          <Radio.Group {...form.getInputProps('universityAction')} mb="lg">
            <Group mb="sm">
              <Radio value="create" label="Create a new university" />
            </Group>
            <Group mb="sm">
              <Radio value="join" label="Request to join an existing university" />
            </Group>
            <Group mb="sm">
              <Radio value="later" label="I'll do this later" />
            </Group>
          </Radio.Group>

          {form.values.universityAction === 'create' && (
            <>
              <TextInput
                label="University Name (Identifier)"
                description="Used as a unique identifier (e.g., dublin-city-university)"
                placeholder="Enter a unique name"
                required
                {...form.getInputProps('universityName')}
                mb="md"
              />

              <TextInput
                label="Display Name"
                description="Full name shown to users (e.g., Dublin City University)"
                placeholder="Enter university display name"
                required
                leftSection={<IconBuildingBank size={16} />}
                {...form.getInputProps('universityDisplayName')}
                mb="md"
              />

              <TextInput
                label="Description"
                description="A brief description of your university"
                placeholder="Enter description"
                {...form.getInputProps('universityDescription')}
                mb="lg"
              />
            </>
          )}

          {form.values.universityAction === 'join' && (
            <>
              <Select
                label="Select University to Join"
                description="You can request to join an existing university"
                placeholder={
                  isLoadingUniversities ? 'Loading universities...' : 'Select a university'
                }
                searchable
                nothingFoundMessage="No universities found"
                data={universities.map(uni => ({
                  value: uni.id,
                  label: `${uni.displayName} (by ${uni.owner?.username || 'Unknown'})`,
                }))}
                {...form.getInputProps('selectedUniversities[0]')}
                disabled={isLoadingUniversities}
                mb="lg"
              />
              <Text size="sm" color="dimmed" mb="md">
                Your request will need to be approved by the university administrator.
              </Text>
            </>
          )}
        </>
      );
    } else if (form.values.role === 'individual') {
      return (
        <>
          <Text mb="md">
            You can request to join universities. This is optional and can be done later.
          </Text>

          <MultiSelect
            data={universities.map(uni => ({
              value: uni.id,
              label: `${uni.displayName} (by ${uni.owner?.username || 'Unknown'})`,
            }))}
            label="Request to Join Universities"
            placeholder={
              isLoadingUniversities ? 'Loading universities...' : 'Select one or more universities'
            }
            searchable
            nothingFoundMessage="No universities found"
            {...form.getInputProps('selectedUniversities')}
            leftSection={<IconSchool size={16} />}
            disabled={isLoadingUniversities}
            mb="lg"
          />

          <Text size="sm" color="dimmed" mb="lg">
            Your requests will need to be approved by university administrators.
          </Text>
        </>
      );
    } else if (form.values.role === 'employer') {
      return (
        <>
          <TextInput
            label="Organization Name"
            placeholder="Your organization's name"
            leftSection={<IconBuildingBank size={16} />}
            required
            {...form.getInputProps('organizationName')}
            mb="xl"
          />
        </>
      );
    }
    return null;
  };

  // Validate step 2 before submission
  const validateStep2 = () => {
    if (form.values.role === 'university') {
      if (form.values.universityAction === 'create') {
        return form.values.universityName && form.values.universityDisplayName;
      }
      if (form.values.universityAction === 'join') {
        return form.values.selectedUniversities.length > 0;
      }
      return true; // 'later' option requires no validation
    }
    if (form.values.role === 'employer') {
      return !!form.values.organizationName;
    }
    return true; // individual requires no validation at this step
  };

  // Render the step 2 submission button
  const renderStep2Button = () => (
    <Group justify="space-between">
      <Button variant="light" onClick={prevStep}>
        Back
      </Button>
      <Button
        type="submit"
        loading={isLoading}
        disabled={!validateStep2()}
        leftSection={<IconDeviceFloppy size={18} />}
      >
        Register
      </Button>
    </Group>
  );

  return (
    <Container size="xs" py="xl">
      <Card
        shadow="md"
        padding="xl"
        radius="lg"
        withBorder
        style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}
      >
        <LoadingOverlay visible={isLoading} />

        <Title order={2} ta="center" mb="sm" c="primaryBlue">
          Create Account
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Join LegiTify to access our blockchain-powered degree verification system
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
          {active === 0 ? renderStep1() : renderStep2()}
          {active === 1 && renderStep2Button()}
        </form>

        <Group justify="center" mt="md">
          <Text size="sm" c="dimmed">
            Already have an account?
          </Text>
          <Text
            component={Link}
            to="/login"
            size="sm"
            fw={500}
            style={{ color: 'var(--primary-blue)' }}
          >
            Sign in
          </Text>
        </Group>
      </Card>
    </Container>
  );
};

export default Register;
