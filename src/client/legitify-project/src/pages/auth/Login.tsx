import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconLock, IconMail } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);

      // Letting the auth context handle setting the token and user info
      console.log('Login successful');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
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
          Welcome Back
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Enter your credentials to access the system
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            leftSection={<IconMail size={16} />}
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            mb="md"
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            leftSection={<IconLock size={16} />}
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required
            mb="lg"
          />

          {error && (
            <Alert
              color="red"
              mb="md"
              radius="md"
              icon={<IconAlertCircle size={16} />}
              title="Authentication Error"
            >
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            color="primaryBlue"
            size="md"
            rightSection={<IconArrowRight size={18} />}
          >
            Sign In
          </Button>

          <Group justify="center" mt="md">
            <Text size="sm" c="dimmed">
              Don't have an account?
            </Text>
            <Text
              component={Link}
              to="/register"
              size="sm"
              fw={500}
              style={{ color: 'var(--primary-blue)' }}
            >
              Register now
            </Text>
          </Group>
        </form>
      </Card>
    </Container>
  );
};

export default Login;
