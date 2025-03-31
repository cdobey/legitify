import { Avatar, Button, Group, Menu, Text, useMantineTheme } from '@mantine/core';
import { IconLogout, IconSettings, IconUser } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Just the auth controls, simplified for logged-in users with right alignment
  return (
    <Group style={{ margin: 0, padding: '0 6px 0 0', justifyContent: 'flex-end', width: '100%' }}>
      {user ? (
        <Menu position="bottom-end" shadow="md" withArrow={false}>
          <Menu.Target>
            <Avatar
              color="primaryBlue"
              radius="xl"
              size={40} // Custom size between md and lg
              style={{
                border: `1px solid ${theme.colors.primaryBlue[3]}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                marginRight: 0, // Ensure no right margin
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center', // Center content vertically and horizontally
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>
            <Menu.Item leftSection={<IconUser size={14} />}>
              <Text size="sm">{user.username}</Text>
            </Menu.Item>
            <Menu.Item leftSection={<IconSettings size={14} />}>Settings</Menu.Item>
            <Menu.Divider />
            <Menu.Label>Organization</Menu.Label>
            <Menu.Item fw={500}>{user.orgName}</Menu.Item>
            <Menu.Item fw={500}>
              Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : (
        <Button
          component={Link}
          to="/register"
          color="primaryBlue"
          style={{
            padding: '8px 16px',
            minWidth: '100px', // Ensures minimum width for the button
          }}
        >
          Register
        </Button>
      )}
    </Group>
  );
}
