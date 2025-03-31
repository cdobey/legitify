import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Select,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowRight,
  IconAt,
  IconBuildingBank,
  IconLock,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth/auth.api';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    role: 'individual' as 'individual' | 'university' | 'employer',
    orgName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use our server API instead of direct Supabase
      await authApi.register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        role: formData.role,
        orgName: formData.orgName,
      });

      // Registration successful - show success and redirect to login
      navigate('/login', {
        state: { message: 'Registration successful. Please log in.' },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container size="xs" py="xl">
      <Card
        shadow="md"
        padding="xl"
        radius="lg"
        withBorder
        style={{ maxWidth: 450, margin: '0 auto' }}
      >
        <Title order={2} ta="center" mb="sm" c="primaryBlue">
          Create Account
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Join LegiTify to access our blockchain-powered degree verification system
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            leftSection={<IconAt size={16} />}
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            mb="md"
          />

          <TextInput
            label="Username"
            placeholder="Choose a username"
            leftSection={<IconUser size={16} />}
            required
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            mb="md"
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            leftSection={<IconLock size={16} />}
            required
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            mb="md"
          />

          <Select
            label="Role"
            placeholder="Select your role"
            leftSection={<IconUserCircle size={16} />}
            required
            value={formData.role}
            onChange={value =>
              setFormData({
                ...formData,
                role: (value || 'individual') as 'university' | 'individual' | 'employer',
              })
            }
            data={[
              { value: 'university', label: 'University' },
              { value: 'individual', label: 'Individual' },
              { value: 'employer', label: 'Employer' },
            ]}
            mb="md"
          />

          <TextInput
            label="Organization Name"
            placeholder="Your organization"
            leftSection={<IconBuildingBank size={16} />}
            required
            value={formData.orgName}
            onChange={e => setFormData({ ...formData, orgName: e.target.value })}
            mb="lg"
          />

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

          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            color="primaryBlue"
            rightSection={<IconArrowRight size={18} />}
          >
            Create Account
          </Button>

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
        </form>
      </Card>
    </Container>
  );
};

export default Register;
