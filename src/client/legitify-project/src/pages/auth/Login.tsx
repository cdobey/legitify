import { StatusIndicator } from '@/components/StatusIndicator';
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowRight,
  IconFingerprint,
  IconLock,
  IconMail,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, twoFactorState, verifyTwoFactor, clearTwoFactorState, user } = useAuth();

  // Handle redirection when user is authenticated
  useEffect(() => {
    if (user && !twoFactorState.required) {
      // Only navigate to home if user is authenticated and 2FA is not required
      navigate('/');
    }
  }, [user, twoFactorState.required, navigate]);

  // Handle normal login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      // Don't navigate here - let the useEffect handle it
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle two-factor verification
  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await verifyTwoFactor(twoFactorCode);
    } catch (err: any) {
      console.error('Two-factor verification error:', err);
      setError(err.message || 'Failed to verify two-factor code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTwoFactor = () => {
    clearTwoFactorState();
    setTwoFactorCode('');
  };

  // Render the two-factor authentication form
  if (twoFactorState.required) {
    return (
      <Container size="xs" py="xl">
        <Card
          shadow="md"
          padding="xl"
          radius="lg"
          withBorder
          className="accent-top-card"
          style={{ maxWidth: 450, margin: '0 auto' }}
        >
          <Title order={2} ta="center" mb="sm" className="accent-gradient-text">
            Two-Factor Authentication
          </Title>
          <Text size="sm" c="dimmed" ta="center" mb="lg">
            Enter the verification code from your authenticator app
          </Text>

          <form onSubmit={handleVerifyTwoFactor}>
            <Stack>
              <TextInput
                label="Verification Code"
                placeholder="Enter 6-digit code"
                leftSection={<IconFingerprint size={16} className="accent-icon" />}
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                required
                maxLength={6}
                className="accent-focus"
                autoFocus
              />

              {error && (
                <Alert
                  color="red"
                  radius="md"
                  icon={<IconAlertCircle size={16} />}
                  title="Verification Error"
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                className="accent-button"
                size="md"
                rightSection={<IconArrowRight size={18} />}
                disabled={twoFactorCode.length !== 6}
              >
                Verify
              </Button>

              <Button variant="subtle" onClick={handleCancelTwoFactor} disabled={isLoading}>
                Cancel
              </Button>
            </Stack>
          </form>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Card
        shadow="md"
        padding="xl"
        radius="lg"
        withBorder
        className="accent-top-card"
        style={{ maxWidth: 450, margin: '0 auto' }}
      >
        <Title order={2} ta="center" mb="sm" className="accent-gradient-text">
          Welcome Back
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Enter your credentials to access the system
        </Text>

        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
            placeholder="your@email.com"
            leftSection={<IconMail size={16} className="accent-icon" />}
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
            mb="md"
            className="accent-focus"
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            leftSection={<IconLock size={16} className="accent-icon" />}
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required
            mb="lg"
            className="accent-focus"
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
            className="accent-button"
            size="md"
            rightSection={<IconArrowRight size={18} />}
          >
            Sign In
          </Button>

          <Group justify="center" mt="md">
            <Text size="sm" c="dimmed">
              Don't have an account?
            </Text>
            <Text component={Link} to="/register" size="sm" fw={500} className="accent-link">
              Register now
            </Text>
          </Group>
        </form>
      </Card>

      <StatusIndicator position="bottom-right" />
    </Container>
  );
};

export default Login;
