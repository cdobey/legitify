import { ActionIcon, Avatar, Button, Menu, Text, Tooltip, useMantineTheme } from '@mantine/core';
import { IconLogout, IconMoonStars, IconSettings, IconSun, IconUser } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const theme = useMantineTheme();

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
      {/* Theme toggle button */}
      <Tooltip label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
        <ActionIcon
          variant="light"
          color={isDarkMode ? 'orange' : 'blue'}
          onClick={toggleTheme}
          size="lg"
          radius="xl"
          aria-label="Toggle theme"
          className={isDarkMode ? 'accent-theme-icon' : ''}
        >
          {isDarkMode ? <IconSun size={18} /> : <IconMoonStars size={18} />}
        </ActionIcon>
      </Tooltip>

      {user ? (
        <Menu position="bottom-end" shadow="lg" radius="md" withArrow={false}>
          <Menu.Target>
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
          </Menu.Target>
          <Menu.Dropdown style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Menu.Label
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                color: getLabelColor(),
                letterSpacing: '-0.2px',
                fontSize: '13px',
              }}
            >
              Account
            </Menu.Label>
            <Menu.Item leftSection={<IconUser size={14} />}>
              <Text size="sm" fw={500}>
                {user.username}
              </Text>
            </Menu.Item>
            <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={14} />}>
              Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label
              style={{
                padding: '8px 12px',
                fontWeight: 600,
                color: getLabelColor(),
                letterSpacing: '-0.2px',
                fontSize: '13px',
              }}
            >
              Organization
            </Menu.Label>
            <Menu.Item fw={500}>{user.orgName}</Menu.Item>
            <Menu.Item fw={500}>
              Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={14} />}
              onClick={handleLogout}
              style={{ marginTop: 4 }}
            >
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : (
        <>
          {/* Theme toggle button (when not logged in) */}
          <Button
            component={Link}
            to="/register"
            className="accent-button"
            style={{
              padding: '8px 20px',
              minWidth: '100px',
              borderRadius: '8px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            Register
          </Button>
        </>
      )}
    </div>
  );
}
