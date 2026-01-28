import { AuthPageBackground } from '@/components/AuthPageBackground';
import { StatusIndicator } from '@/components/StatusIndicator';
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconLock, IconMail } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login: loginAuth, twoFactorState, clearTwoFactorState, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginAuth(email, password);
      if (!twoFactorState.required) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await verifyTwoFactor(twoFactorCode);
      navigate('/dashboard');
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

  const cardStyle = {
    maxWidth: 450,
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
    margin: '0 auto',
  };

  // Render the two-factor authentication form
  if (twoFactorState.required) {
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
          <Title order={2} ta="center" mb="sm" className="accent-gradient-text">
            Two-Factor Authentication
          </Title>
          <Text size="sm" c="dimmed" ta="center" mb="xl">
            Enter the verification code sent to your email
          </Text>

          {error && (
            <Alert
              color="red"
              mb="md"
              radius="md"
              icon={<IconAlertCircle size={16} />}
              title="Verification Error"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleTwoFactorVerify}>
            <Stack>
              <TextInput
                required
                label="Verification Code"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value.trim())}
                maxLength={6}
                placeholder="Enter 6-digit code"
                error={
                  twoFactorCode.length > 0 && twoFactorCode.length !== 6
                    ? 'Code must be 6 digits'
                    : ''
                }
              />

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
      </AuthPageBackground>
    );
  }

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
        <Title order={2} ta="center" mb="sm" className="accent-gradient-text">
          Welcome Back
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="lg">
          Enter your credentials to access the system
        </Text>

        {error && (
          <Alert
            color="red"
            mb="md"
            radius="md"
            icon={<IconAlertCircle size={16} />}
            title="Login Error"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              leftSection={<IconMail size={16} className="accent-icon" />}
            />

            <PasswordInput
              required
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              leftSection={<IconLock size={16} className="accent-icon" />}
            />

            <Group justify="space-between" mt="md">
              <Anchor component={Link} to="/forgot-password" fw={500} className="accent-link">
                Forgot password?
              </Anchor>
            </Group>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              className="accent-button"
              size="md"
              rightSection={<IconArrowRight size={18} />}
            >
              Login
            </Button>
          </Stack>
        </form>

        <Text mt="md" ta="center" size="sm">
          Don't have an account?{' '}
          <Anchor href="/register" fw={700} className="accent-link">
            Register
          </Anchor>
        </Text>
      </Card>

      <StatusIndicator position="bottom-right" />
    </AuthPageBackground>
  );
};

export default Login;
