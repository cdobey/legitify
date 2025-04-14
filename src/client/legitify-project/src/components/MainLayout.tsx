import { AppShell, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCertificate,
  IconCertificate2,
  IconCheck,
  IconFileCheck,
  IconFiles,
  IconHome,
  IconInbox,
  IconSchool,
  IconSettings,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import AppHeader from './AppHeader';
import AppNavigation from './AppNavigation';
import Breadcrumbs from './Breadcrumbs';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const theme = useMantineTheme();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Scroll-aware header states
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  // Track scroll position and direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;

      // Make header hide immediately when scrolling down (any amount)
      // Show header only when scrolling up or at the very top
      const shouldBeVisible =
        prevScrollPos > currentScrollPos || // Scrolling up
        currentScrollPos < 10; // At the very top (more sensitive)

      setVisible(shouldBeVisible);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  // Auto-collapse sidebar when route changes
  useEffect(() => {
    setNavCollapsed(true);
  }, [location.pathname]);

  // Handle clicks outside the sidebar to collapse it
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        !navCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setNavCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [navCollapsed]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setNavCollapsed(!navCollapsed);
  };

  // Add function to get page icon
  const getPageIcon = () => {
    const path = location.pathname;
    if (path === '/') return <IconHome size={28} stroke={1.5} />;
    if (path.includes('/degree/issue')) return <IconCertificate size={28} stroke={1.5} />;
    if (path.includes('/degree/manage')) return <IconFiles size={28} stroke={1.5} />;
    if (path.includes('/degree/requests')) return <IconInbox size={28} stroke={1.5} />;
    if (path.includes('/degree/verify')) return <IconCheck size={28} stroke={1.5} />;
    if (path.includes('/degree/accessible')) return <IconFileCheck size={28} stroke={1.5} />;
    if (path.includes('/degree/view/')) return <IconCertificate2 size={28} stroke={1.5} />;
    if (path.includes('/profile')) return <IconUser size={28} stroke={1.5} />;
    if (path.includes('/dashboard')) return <IconHome size={28} stroke={1.5} />;
    if (path.includes('/settings')) return <IconSettings size={28} stroke={1.5} />;
    if (path.includes('/universities')) return <IconSchool size={28} stroke={1.5} />;
    if (path.includes('/users/search')) return <IconUserPlus size={28} stroke={1.5} />;
    return <IconHome size={28} stroke={1.5} />;
  };

  // Update function to get page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') {
      return 'Home';
    }
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/degree/issue') return 'Issue Degree';
    if (path === '/degree/manage') return 'Manage Degrees';
    if (path === '/degree/requests') return 'Access Requests';
    if (path === '/degree/verify') return 'Verify Degree';
    if (path === '/degree/accessible') return 'Accessible Degrees';
    if (path.includes('/degree/view/')) return 'Degree Certificate';
    if (path === '/profile') return 'Profile';
    if (path === '/settings') return 'Settings';
    if (path.includes('/universities')) return 'Universities';
    if (path.includes('/users/search')) return 'Search Users';

    // Convert path to title case
    return (
      path
        .split('/')
        .pop()
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Dashboard'
    );
  };

  // Add function to get page description
  const getPageDescription = () => {
    const path = location.pathname;
    if (path === '/') return 'Welcome to LegiTify';
    if (path === '/dashboard') return 'Manage your academic credentials';
    if (path === '/degree/issue') return 'Issue new academic credentials securely';
    if (path === '/degree/manage') return 'Manage and view your academic credentials';
    if (path === '/degree/requests') return 'Manage access requests for your credentials';
    if (path === '/degree/verify') return 'Verify the authenticity of credentials';
    if (path === '/degree/accessible') return 'View credentials you have access to';
    if (path.includes('/degree/view/')) return 'View verified certificate details';
    if (path === '/profile') return 'View and manage your profile information';
    if (path === '/settings') return 'Manage your account settings';
    if (path.includes('/universities')) return 'Manage your university affiliations';
    if (path.includes('/users/search')) return 'Search for users to request credential access';

    return '';
  };

  // Style for header background based on theme
  const getHeaderBackground = () => {
    return isDarkMode ? 'rgba(42, 45, 54, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  };

  // Style for border based on theme
  const getHeaderBorder = () => {
    return isDarkMode ? '1px solid rgba(50, 52, 62, 0.5)' : '1px solid rgba(234, 236, 239, 0.5)';
  };

  // Get main content background
  const getMainBackground = () => {
    return isDarkMode
      ? 'linear-gradient(180deg, #1f2128 0%, #232631 100%)'
      : 'linear-gradient(180deg, #f4f8fa 0%, #edf1f5 100%)';
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: navCollapsed ? 80 : 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={0}
    >
      {/* Full-height sidebar with ref for outside click detection */}
      <AppShell.Navbar
        p={0}
        ref={sidebarRef}
        style={{
          transition: 'width 0.3s ease',
          zIndex: 400,
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: navCollapsed ? 80 : 280,
          overflow: 'hidden',
          boxShadow: navCollapsed ? 'none' : '0 0 10px rgba(0, 0, 0, 0.1)',
          backgroundColor: 'var(--sidebar-bg)',
        }}
      >
        <AppNavigation collapsed={navCollapsed} onToggleCollapse={toggleSidebar} />
      </AppShell.Navbar>

      <AppShell.Header
        style={{
          zIndex: 300,
          position: 'fixed',
          top: 0,
          right: 0,
          left: navCollapsed ? 80 : 280,
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.25s ease-in-out, left 0.3s ease',
          backgroundColor: getHeaderBackground(),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: getHeaderBorder(),
          boxShadow: visible ? '0 4px 20px rgba(0, 0, 0, 0.03)' : 'none',
          height: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            padding: '0 16px',
          }}
        >
          {/* Left side with page title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              className="header-icon"
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #2ca6d3 0%, #1991bd 100%)'
                  : 'linear-gradient(135deg, #2291d6 0%, #147cc4 100%)',
                borderRadius: '10px',
                border: isDarkMode
                  ? '1px solid rgba(255, 255, 255, 0.15)'
                  : '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {getPageIcon()}
            </div>

            <div>
              <div
                className="header-title"
                style={{
                  margin: 0,
                  padding: 0,
                  fontSize: '18px',
                }}
              >
                {getPageTitle()}
              </div>

              {location.pathname !== '/' && (
                <div
                  className="header-subtitle"
                  style={{
                    marginTop: 2,
                  }}
                >
                  {getPageDescription()}
                </div>
              )}
            </div>
          </div>

          {/* Right side with user controls */}
          <AppHeader />
        </div>
      </AppShell.Header>

      <AppShell.Main
        style={{
          marginLeft: navCollapsed ? 80 : 280,
          marginTop: 100,
          transition: 'margin-left 0.3s ease',
          background: getMainBackground(),
          padding: location.pathname === '/' ? 0 : '24px 0',
        }}
      >
        {/* Breadcrumbs integrated into the normal document flow */}
        {location.pathname !== '/' && (
          <div
            style={{
              backgroundColor: isDarkMode ? 'rgba(37, 39, 48, 0.7)' : 'rgba(249, 250, 251, 0.7)',
              backdropFilter: 'blur(8px)',
              borderBottom: isDarkMode
                ? '1px solid rgba(50, 52, 62, 0.5)'
                : '1px solid rgba(234, 236, 239, 0.5)',
              marginBottom: '24px',
            }}
          >
            <Breadcrumbs />
          </div>
        )}

        <div style={{ padding: location.pathname === '/' ? 0 : '0 24px' }}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
