import {
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import {
  IconBookmark,
  IconCertificate,
  IconFileCheck,
  IconFiles,
  IconHome,
  IconInbox,
  IconKey,
  IconLogout,
  IconSearch,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AppNavigationProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AppNavigation({ collapsed, onToggleCollapse }: AppNavigationProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useMantineTheme();

  // Common links for all users
  const commonLinks = [
    { label: 'Home', to: '/', icon: <IconHome size={collapsed ? 20 : 16} /> },
    { label: 'About', to: '/about', icon: <IconBookmark size={collapsed ? 20 : 16} /> },
  ];

  // Role-specific links
  const universityLinks = [
    {
      label: 'Issue Degree',
      to: '/degree/issue',
      icon: <IconCertificate size={collapsed ? 20 : 16} />,
    },
  ];

  const individualLinks = [
    { label: 'My Degrees', to: '/degree/manage', icon: <IconFiles size={collapsed ? 20 : 16} /> },
    {
      label: 'Access Requests',
      to: '/degree/requests',
      icon: <IconInbox size={collapsed ? 20 : 16} />,
    },
  ];

  const employerLinks = [
    {
      label: 'Verify Degree',
      to: '/degree/verify',
      icon: <IconSearch size={collapsed ? 20 : 16} />,
    },
    {
      label: 'Search Users',
      to: '/users/search',
      icon: <IconUserPlus size={collapsed ? 20 : 16} />,
    },
    {
      label: 'Accessible Degrees',
      to: '/degree/accessible',
      icon: <IconFileCheck size={collapsed ? 20 : 16} />,
    },
  ];

  // Authentication links
  const authLinks = !user
    ? [{ label: 'Login', to: '/login', icon: <IconUser size={collapsed ? 20 : 16} /> }]
    : [];

  // Determine which links to show based on user role
  const roleLinks = user
    ? user.role === 'university'
      ? universityLinks
      : user.role === 'individual'
      ? individualLinks
      : user.role === 'employer'
      ? employerLinks
      : []
    : [];

  // App logo with hamburger/X at the top of sidebar
  const AppLogo = () => (
    <Box
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-light)',
        backgroundColor: 'white',
      }}
    >
      <Group gap={collapsed ? 0 : 'md'} wrap="nowrap" align="center">
        <Burger
          opened={!collapsed}
          onClick={onToggleCollapse}
          size="sm"
          aria-label="Toggle navigation"
          color={theme.colors.primaryBlue[6]}
        />
        {!collapsed && (
          <Title order={3} c="primaryBlue">
            LegiTify
          </Title>
        )}
      </Group>
    </Box>
  );

  // Render a link in collapsed or expanded mode
  const renderNavLink = (
    link: { label: string; to: string; icon: JSX.Element },
    active: boolean,
  ) => {
    if (collapsed) {
      return (
        <Box
          component={Link}
          to={link.to}
          key={link.label}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '12px 0',
            borderRadius: '8px',
            backgroundColor: active ? 'rgba(60, 106, 195, 0.1)' : 'transparent',
            color: active ? theme.colors.primaryBlue[6] : 'inherit',
            marginBottom: '8px',
          }}
        >
          {link.icon}
        </Box>
      );
    }

    return (
      <NavLink
        key={link.label}
        label={link.label}
        leftSection={link.icon}
        component={Link}
        to={link.to}
        active={active}
        style={{ marginBottom: '4px' }}
      />
    );
  };

  // Render a section header (only in expanded mode)
  const renderSectionHeader = (title: string) => {
    if (collapsed) return null;

    return (
      <Text size="xs" fw={600} c="dimmed" mb="xs" mt="md">
        {title}
      </Text>
    );
  };

  // Render auth buttons at bottom (only when not logged in)
  const renderAuthLinks = () => {
    if (user) return null;

    if (collapsed) {
      return <Box>{authLinks.map(link => renderNavLink(link, location.pathname === link.to))}</Box>;
    }

    return (
      <Box p="md">
        {renderSectionHeader('ACCOUNT')}
        <Group grow>
          <Button
            component={Link}
            to="/login"
            variant="outline"
            leftSection={<IconKey size={16} />}
            size="sm"
          >
            Login
          </Button>
          <Button
            component={Link}
            to="/register"
            leftSection={<IconUserPlus size={16} />}
            size="sm"
          >
            Register
          </Button>
        </Group>
      </Box>
    );
  };

  // Render logout button for collapsed mode
  const renderLogoutButton = () => {
    if (!user) return null;

    if (collapsed) {
      return (
        <Box
          p="md"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderTop: 'none',
          }}
        >
          <Button variant="subtle" color="red" onClick={() => logout()} style={{ padding: 8 }}>
            <IconLogout size={20} />
          </Button>
        </Box>
      );
    }

    // For expanded mode - handled in renderProfileMenu
    return null;
  };

  // Add profile menu component - only for expanded mode
  const renderProfileMenu = () => {
    if (!user || collapsed) return null;

    return (
      <Group style={{ padding: '12px', justifyContent: 'space-between' }}>
        <Group style={{ cursor: 'pointer' }}>
          <Avatar
            color="primaryBlue"
            radius="xl"
            size="md"
            style={{
              border: `2px solid ${theme.colors.primaryBlue[3]}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Text size="sm" fw={500}>
              {user.username}
            </Text>
            <Text size="xs" c="dimmed">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Text>
          </Box>
        </Group>

        <Button
          variant="subtle"
          color="red"
          onClick={() => logout()}
          leftSection={<IconLogout size={16} />}
          size="xs"
        >
          Logout
        </Button>
      </Group>
    );
  };

  return (
    <Stack gap={0} h="100%" py={0} style={{ display: 'flex', flexDirection: 'column' }}>
      {/* App logo with hamburger/X at the top */}
      <AppLogo />

      {/* Navigation links container with overflow visible for tooltips */}
      <Box p={collapsed ? 'xs' : 'md'} style={{ flexGrow: 1, overflow: 'visible' }}>
        {!collapsed && !user && renderSectionHeader('NAVIGATION')}
        {commonLinks.map(link => renderNavLink(link, location.pathname === link.to))}

        {user && (
          <>
            {!collapsed && renderSectionHeader(user.role.toUpperCase() + ' ACTIONS')}
            {roleLinks.map(link => renderNavLink(link, location.pathname === link.to))}

            {!collapsed && renderSectionHeader('ACCOUNT')}
            {renderNavLink(
              { label: 'Profile', to: '/profile', icon: <IconUser size={collapsed ? 20 : 16} /> },
              location.pathname === '/profile',
            )}
          </>
        )}
      </Box>

      {/* Add spacer to push user section to bottom */}
      <Box style={{ flexGrow: 1 }} />

      {/* User section at bottom with logout button */}
      {user && (
        <Box
          style={{
            borderTop: '1px solid var(--border-light)',
          }}
        >
          {collapsed ? renderLogoutButton() : renderProfileMenu()}
        </Box>
      )}

      {/* Auth links at the bottom for non-logged in users */}
      {!user && renderAuthLinks()}
    </Stack>
  );
}
