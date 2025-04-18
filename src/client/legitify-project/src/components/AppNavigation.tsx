import {
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  useMantineTheme,
} from '@mantine/core';
import {
  IconCertificate,
  IconFileCheck,
  IconFiles,
  IconHome,
  IconInbox,
  IconKey,
  IconLogout,
  IconSchool,
  IconSearch,
  IconSettings,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface AppNavigationProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AppNavigation({ collapsed, onToggleCollapse }: AppNavigationProps) {
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const theme = useMantineTheme();

  // Common links for all users - Home now points to dashboard for logged-in users
  const commonLinks = [
    {
      label: 'Home',
      to: user ? '/dashboard' : '/',
      icon: <IconHome size={collapsed ? 22 : 18} />,
    },
  ];

  // Role-specific links
  const universityLinks = [
    {
      label: 'Issue Degree',
      to: '/degree/issue',
      icon: <IconCertificate size={collapsed ? 22 : 18} />,
    },
    {
      label: 'All Degrees',
      to: '/degrees',
      icon: <IconFiles size={collapsed ? 22 : 18} />,
    },
    {
      label: 'Manage University',
      to: '/university/manage',
      icon: <IconSchool size={collapsed ? 22 : 18} />,
    },
  ];

  const individualLinks = [
    { label: 'My Degrees', to: '/degree/manage', icon: <IconFiles size={collapsed ? 22 : 18} /> },
    {
      label: 'My Universities',
      to: '/universities',
      icon: <IconSchool size={collapsed ? 22 : 18} />,
    },
    {
      label: 'Access Requests',
      to: '/degree/requests',
      icon: <IconInbox size={collapsed ? 22 : 18} />,
    },
  ];

  const employerLinks = [
    {
      label: 'Verify Degree',
      to: '/degree/verify',
      icon: <IconSearch size={collapsed ? 22 : 18} />,
    },
    {
      label: 'Search Users',
      to: '/users/search',
      icon: <IconUserPlus size={collapsed ? 22 : 18} />,
    },
    {
      label: 'Accessible Degrees',
      to: '/degrees',
      icon: <IconFileCheck size={collapsed ? 22 : 18} />,
    },
  ];

  // Authentication links
  const authLinks = !user
    ? [{ label: 'Login', to: '/login', icon: <IconUser size={collapsed ? 22 : 18} /> }]
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
      }}
    >
      <Group gap={collapsed ? 0 : 'md'} wrap="nowrap" align="center">
        <Burger
          opened={!collapsed}
          onClick={onToggleCollapse}
          size="sm"
          aria-label="Toggle navigation"
          color={isDarkMode ? theme.colors.primaryBlue[4] : theme.colors.primaryBlue[6]}
        />
        {!collapsed && (
          <img
            src={isDarkMode ? '/dark-mode-header-logo.png' : '/header-image.png'}
            alt="LegiTify Logo"
            style={{
              maxHeight: '35px',
              objectFit: 'contain',
            }}
          />
        )}
      </Group>
    </Box>
  );

  const collapsedNavLinkStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px 0',
    borderRadius: '8px',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  };

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
            ...collapsedNavLinkStyle,
            backgroundColor: active ? 'rgba(60, 106, 195, 0.1)' : 'transparent',
            color: active ? theme.colors.primaryBlue[6] : 'inherit',
          }}
          onMouseEnter={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = active
              ? 'rgba(60, 106, 195, 0.2)'
              : 'rgba(0, 0, 0, 0.05)';
            target.style.transform = 'scale(1.05)';
            target.style.color = theme.colors.primaryBlue[6];
          }}
          onMouseLeave={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = active ? 'rgba(60, 106, 195, 0.1)' : 'transparent';
            target.style.transform = 'scale(1)';
            target.style.color = active ? theme.colors.primaryBlue[6] : 'inherit';
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
            leftSection={<IconKey size={18} />}
            size="sm"
          >
            Login
          </Button>
          <Button
            component={Link}
            to="/register"
            leftSection={<IconUserPlus size={18} />}
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
            <IconLogout size={22} />
          </Button>
        </Box>
      );
    }

    return null;
  };

  // Add profile menu component - only for expanded mode
  const renderProfileMenu = () => {
    if (!user || collapsed) return null;

    return (
      <Group style={{ padding: '12px', justifyContent: 'space-between' }}>
        <Group style={{ cursor: 'pointer' }}>
          <Avatar
            src={user.profilePictureUrl}
            color="primaryBlue"
            radius="xl"
            size="md"
            style={{
              border: `2px solid ${theme.colors.primaryBlue[3]}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {!user.profilePictureUrl && user.username.charAt(0).toUpperCase()}
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
          leftSection={<IconLogout size={18} />}
          size="xs"
        >
          Logout
        </Button>
      </Group>
    );
  };

  return (
    <Stack gap={0} h="100%" py={0} style={{ display: 'flex', flexDirection: 'column' }}>
      <AppLogo />

      <Box p={collapsed ? 'xs' : 'md'} style={{ flexGrow: 1, overflow: 'visible' }}>
        {!collapsed && !user && renderSectionHeader('NAVIGATION')}
        {commonLinks.map(link => renderNavLink(link, location.pathname === link.to))}

        {user && (
          <>
            {!collapsed && renderSectionHeader(user.role.toUpperCase() + ' ACTIONS')}
            {roleLinks.map(link => renderNavLink(link, location.pathname === link.to))}

            {!collapsed && renderSectionHeader('ACCOUNT')}
            {renderNavLink(
              {
                label: 'Settings',
                to: '/settings',
                icon: <IconSettings size={collapsed ? 22 : 18} />,
              },
              location.pathname === '/settings',
            )}
          </>
        )}
      </Box>

      <Box style={{ flexGrow: 1 }} />

      {user && (
        <Box
          style={{
            borderTop: '1px solid var(--border-light)',
          }}
        >
          {collapsed ? renderLogoutButton() : renderProfileMenu()}
        </Box>
      )}

      {!user && renderAuthLinks()}
    </Stack>
  );
}
