import {
  ActionIcon,
  Avatar,
  Button,
  Divider,
  Group,
  Menu,
  SegmentedControl,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import {
  IconLogout,
  IconMoonStars,
  IconSettings,
  IconSun,
  IconUserCircle,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, setLightTheme, setDarkTheme } = useTheme();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const location = useLocation();

  const isRegisterPage = location.pathname === '/register';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Get the appropriate text color based on theme
  const getLabelColor = () => (isDarkMode ? '#a0aec0' : '#64748b');

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        margin: 0,
        padding: 0,
        gap: '12px',
      }}
    >
      {user ? (
        <Menu position="bottom-end" shadow="lg" radius="md" withArrow={false} width={260}>
          <Menu.Target>
            {user.profilePictureUrl ? (
              <Avatar
                src={user.profilePictureUrl}
                radius="xl"
                size={44}
                style={{
                  border: isDarkMode
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: isDarkMode
                    ? '0 3px 10px rgba(0, 0, 0, 0.3)'
                    : '0 3px 10px rgba(60, 106, 195, 0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 5px 15px rgba(0, 0, 0, 0.4)'
                    : '0 5px 15px rgba(60, 106, 195, 0.4)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 3px 10px rgba(0, 0, 0, 0.3)'
                    : '0 3px 10px rgba(60, 106, 195, 0.3)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              />
            ) : (
              <Avatar
                radius="xl"
                size={44}
                color="white"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #3c6ac3 0%, #2455b2 100%)',
                  border: isDarkMode
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: isDarkMode
                    ? '0 3px 10px rgba(0, 0, 0, 0.3)'
                    : '0 3px 10px rgba(60, 106, 195, 0.3)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 5px 15px rgba(0, 0, 0, 0.4)'
                    : '0 5px 15px rgba(60, 106, 195, 0.4)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 3px 10px rgba(0, 0, 0, 0.3)'
                    : '0 3px 10px rgba(60, 106, 195, 0.3)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
            )}
          </Menu.Target>
          <Menu.Dropdown style={{ borderRadius: '12px', overflow: 'hidden', padding: '12px' }}>
            {/* User profile section at the top */}
            <Group
              p="sm"
              mb="xs"
              style={{
                borderBottom: isDarkMode ? '1px solid #2C2E33' : '1px solid #e9ecef',
                paddingBottom: '15px',
              }}
            >
              <Avatar
                src={user.profilePictureUrl}
                radius="xl"
                size={42}
                style={{
                  border: isDarkMode
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(60, 106, 195, 0.2)',
                }}
              >
                {!user.profilePictureUrl && user.username.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={600}>
                  {user.username}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {user.email}
                </Text>
              </div>
            </Group>

            {/* Theme toggle with segmented control */}
            <div style={{ padding: '5px 8px 12px 8px' }}>
              <Text size="xs" fw={500} c="dimmed" mb={6} style={{ marginLeft: '4px' }}>
                APPEARANCE
              </Text>
              <SegmentedControl
                fullWidth
                value={isDarkMode ? 'dark' : 'light'}
                onChange={value => (value === 'dark' ? setDarkTheme() : setLightTheme())}
                data={[
                  {
                    value: 'light',
                    label: (
                      <Group gap={6} wrap="nowrap">
                        <IconSun size={16} style={{ color: theme.colors.yellow[5] }} />
                        <Text size="xs" fw={500}>
                          Light
                        </Text>
                      </Group>
                    ),
                  },
                  {
                    value: 'dark',
                    label: (
                      <Group gap={6} wrap="nowrap">
                        <IconMoonStars size={16} style={{ color: theme.colors.blue[5] }} />
                        <Text size="xs" fw={500}>
                          Dark
                        </Text>
                      </Group>
                    ),
                  },
                ]}
                style={{
                  backgroundColor: isDarkMode ? '#252731' : '#f1f3f5',
                  border: isDarkMode ? '1px solid #373A40' : '1px solid #e9ecef',
                }}
                classNames={{
                  root: 'no-focus-outline',
                  indicator: isDarkMode
                    ? 'accent-theme-segment-dark'
                    : 'accent-theme-segment-light',
                }}
              />
            </div>

            <Divider my="xs" />

            {/* Account section */}
            <div style={{ padding: '0 8px 10px 8px' }}>
              <Text size="xs" fw={500} c="dimmed" mb={6} style={{ marginLeft: '4px' }}>
                ACCOUNT
              </Text>

              <Menu.Item
                component={Link}
                to="/settings"
                leftSection={<IconSettings size={16} />}
                py="xs"
                style={{ borderRadius: '6px' }}
              >
                Settings
              </Menu.Item>

              <Menu.Item
                component={Link}
                to="/profile"
                leftSection={<IconUserCircle size={16} />}
                py="xs"
                style={{ borderRadius: '6px' }}
              >
                My Profile
              </Menu.Item>
            </div>

            {/* Organization section */}
            <div style={{ padding: '5px 8px 10px 8px' }}>
              <Text size="xs" fw={500} c="dimmed" mb={6} style={{ marginLeft: '4px' }}>
                ORGANIZATION
              </Text>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: isDarkMode ? '#252731' : '#f8f9fa',
                  border: isDarkMode ? '1px solid #2C2E33' : '1px solid #e9ecef',
                }}
              >
                <Text size="sm" fw={500} mb={4}>
                  {user.orgName}
                </Text>
                <Text size="xs" c="dimmed">
                  Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </div>
            </div>

            <Divider my="md" />

            {/* Logout button */}
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
              py="xs"
              style={{ borderRadius: '6px' }}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : (
        <>
          {/* Theme toggle button (when not logged in) */}
          <Tooltip label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            <ActionIcon
              variant="light"
              color={isDarkMode ? 'orange' : 'blue'}
              onClick={toggleTheme}
              size="lg"
              radius="xl"
              aria-label="Toggle theme"
              className={isDarkMode ? 'accent-theme-icon' : ''}
              mr="xs"
            >
              {isDarkMode ? <IconSun size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>
          </Tooltip>

          <Button
            component={Link}
            to={isRegisterPage ? '/login' : '/register'}
            className="accent-button"
            style={{
              padding: '8px 20px',
              minWidth: '100px',
              borderRadius: '8px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            {isRegisterPage ? 'Login' : 'Register'}
          </Button>
        </>
      )}
    </div>
  );
}
