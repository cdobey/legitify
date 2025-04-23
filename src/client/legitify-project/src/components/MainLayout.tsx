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
  IconList,
  IconSchool,
  IconSettings,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if we're on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Show navbar when:
  // 1. User is logged in, regardless of path
  // 2. Except on login/register pages
  const shouldShowNavbar = user && !isAuthPage;

  // Hide navbar when:
  // 1. On login/register pages OR
  // 2. On homepage when not logged in
  const shouldHideNavbar = isAuthPage || (location.pathname === '/' && !user);

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

  const getPageIcon = () => {
    const path = location.pathname;
    if (path === '/') return <IconHome size={28} stroke={1.5} />;
    if (path.includes('/credential/issue')) return <IconCertificate size={28} stroke={1.5} />;
    if (path.includes('/credential/manage')) return <IconFiles size={28} stroke={1.5} />;
    if (path.includes('/credential/requests')) return <IconInbox size={28} stroke={1.5} />;
    if (path.includes('/credential/verify')) return <IconCheck size={28} stroke={1.5} />;
    if (path.includes('/credential/accessible')) return <IconFileCheck size={28} stroke={1.5} />;
    if (path.includes('/credential/view/')) return <IconCertificate2 size={28} stroke={1.5} />;
    if (path.includes('/credential/all')) return <IconList size={28} stroke={1.5} />;
    if (path === '/credentials') return <IconList size={28} stroke={1.5} />;
    if (path.includes('/profile')) return <IconUser size={28} stroke={1.5} />;
    if (path.includes('/dashboard')) return <IconHome size={28} stroke={1.5} />;
    if (path.includes('/settings')) return <IconSettings size={28} stroke={1.5} />;
    if (path.includes('/issuers')) return <IconSchool size={28} stroke={1.5} />;
    if (path.includes('/issuer')) return <IconSchool size={28} stroke={1.5} />;
    if (path.includes('/users/search')) return <IconUserPlus size={28} stroke={1.5} />;
    return <IconHome size={28} stroke={1.5} />;
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') {
      return 'Home';
    }
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/credential/issue') return 'Issue Credential';
    if (path === '/credential/manage') return 'Manage Credentials';
    if (path === '/credential/requests') return 'Access Requests';
    if (path === '/credential/verify') return 'Verify Credential';
    if (path === '/credential/accessible') return 'Accessible Credentials';
    if (path === '/credential/all-records') return 'Blockchain Records';
    if (path === '/credentials') {
      return user?.role === 'verifier' ? 'Accessible Credentials' : 'Blockchain Records';
    }
    if (path.includes('/credential/view/')) return 'Credential Certificate';
    if (path === '/profile') return 'Profile';
    if (path === '/settings') return 'Settings';
    if (path.includes('/issuer')) return 'Manage Issuer';
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

  const getPageDescription = () => {
    const path = location.pathname;
    if (path === '/') return 'Welcome to Legitify';
    if (path === '/dashboard') return 'Manage your academic credentials';
    if (path === '/credential/issue') return 'Issue new academic credentials securely';
    if (path === '/credential/manage') return 'Manage and view your academic credentials';
    if (path === '/credential/requests') return 'Manage access requests for your credentials';
    if (path === '/credential/verify') return 'Verify the authenticity of credentials';
    if (path === '/credential/accessible') return 'View credentials you have access to';
    if (path === '/credential/all-records') return 'View all records stored on the blockchain';
    if (path === '/credentials') {
      return user?.role === 'verifier'
        ? 'View credentials you have access to'
        : 'View all records stored on the blockchain';
    }
    if (path.includes('/credential/view/')) return 'View verified certificate details';
    if (path === '/profile') return 'View and manage your profile information';
    if (path === '/settings') return 'Manage your account settings';
    if (path.includes('/issuer')) return 'Manage your issuer affiliations';
    if (path.includes('/users/search')) return 'Search for users to request credential access';

    return '';
  };

  const getHeaderBackground = () => {
    return isDarkMode
      ? 'linear-gradient(to right, rgba(42, 45, 54, 0.85), rgba(47, 50, 61, 0.85))'
      : 'linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(250, 252, 255, 0.9))';
  };

  const getHeaderBorder = () => {
    return isDarkMode ? '1px solid rgba(50, 52, 62, 0.5)' : '1px solid rgba(234, 236, 239, 0.5)';
  };

  const getMainBackground = () => {
    return isDarkMode
      ? "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232a2d36' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(180deg, #1f2128 0%, #232631 100%)"
      : "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e9f0' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(180deg, #f4f8fa 0%, #edf1f5 100%)";
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
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!shouldHideNavbar && (
        <AppShell.Navbar
          p={0}
          ref={sidebarRef}
          style={{
            transition: 'width 0.3s ease, box-shadow 0.3s ease',
            zIndex: 400,
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            width: navCollapsed ? 80 : 280,
            overflow: 'hidden',
            boxShadow: navCollapsed
              ? 'none'
              : isDarkMode
              ? '0 0 20px rgba(0, 0, 0, 0.3)'
              : '0 5px 20px rgba(0, 0, 0, 0.08)',
            backgroundColor: 'var(--sidebar-bg)',
            backgroundImage: isDarkMode
              ? 'linear-gradient(to bottom, rgba(47, 50, 61, 0.3), rgba(42, 45, 54, 0))'
              : 'linear-gradient(to bottom, rgba(250, 252, 255, 0.5), rgba(255, 255, 255, 0))',
            borderRight: isDarkMode
              ? '1px solid rgba(50, 52, 62, 0.7)'
              : '1px solid rgba(234, 236, 239, 0.7)',
          }}
        >
          <AppNavigation collapsed={navCollapsed} onToggleCollapse={toggleSidebar} />
        </AppShell.Navbar>
      )}

      <AppShell.Header
        style={{
          zIndex: 300,
          position: 'fixed',
          top: 0,
          right: 0,
          left: shouldHideNavbar ? 0 : navCollapsed ? 80 : 280,
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.25s ease-in-out, left 0.3s ease, box-shadow 0.3s ease',
          background: getHeaderBackground(),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: getHeaderBorder(),
          boxShadow: visible
            ? isDarkMode
              ? '0 4px 20px rgba(0, 0, 0, 0.15)'
              : '0 4px 20px rgba(0, 0, 0, 0.06)'
            : 'none',
          height: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: shouldHideNavbar ? 'center' : 'space-between',
            height: '100%',
            padding: '0 16px',
          }}
        >
          {shouldHideNavbar ? (
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <img
                src={isDarkMode ? '/dark-mode-header-logo.png' : '/header-image.png'}
                alt="Legitify Logo"
                style={{
                  height: '40px',
                  objectFit: 'contain',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  display: 'block',
                  margin: 'auto',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            </Link>
          ) : (
            <>
              {/* Left side with page title for non-landing pages */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Link to="/" style={{ textDecoration: 'none' }}>
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
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
                      boxShadow: isDarkMode
                        ? '0 4px 15px rgba(44, 166, 211, 0.25)'
                        : '0 4px 15px rgba(34, 145, 214, 0.25)',
                    }}
                  >
                    {getPageIcon()}
                  </div>
                </Link>

                <div>
                  <div
                    className="header-title"
                    style={{
                      margin: 0,
                      padding: 0,
                      fontSize: '18px',
                      fontWeight: 600,
                      letterSpacing: '-0.3px',
                      color: isDarkMode ? '#ffffff' : '#1a202c',
                      textShadow: isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
                      transition: 'color 0.3s ease, text-shadow 0.3s ease',
                    }}
                  >
                    {getPageTitle()}
                  </div>

                  <div
                    className="header-subtitle"
                    style={{
                      marginTop: 2,
                    }}
                  >
                    {getPageDescription()}
                  </div>
                </div>
              </div>

              {/* Right side with user controls */}
              <AppHeader />
            </>
          )}

          {shouldHideNavbar && (
            <div
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <AppHeader />
            </div>
          )}
        </div>
      </AppShell.Header>

      <AppShell.Main
        style={{
          marginLeft: shouldHideNavbar ? 0 : navCollapsed ? 80 : 280,
          marginTop: 60,
          transition: 'margin-left 0.3s ease',
          background: getMainBackground(),
          backgroundSize: 'auto, cover',
          padding: location.pathname === '/' ? 0 : '24px 0',
          minHeight: 'calc(100vh - 60px)',
          position: 'relative',
          overflow: 'hidden auto',
        }}
      >
        {location.pathname !== '/' && (
          <div
            style={{
              backgroundColor: isDarkMode ? 'rgba(37, 39, 48, 0.8)' : 'rgba(249, 250, 251, 0.8)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderBottom: isDarkMode
                ? '1px solid rgba(50, 52, 62, 0.5)'
                : '1px solid rgba(234, 236, 239, 0.5)',
              marginBottom: '24px',
              boxShadow: isDarkMode
                ? '0 1px 5px rgba(0, 0, 0, 0.1)'
                : '0 1px 5px rgba(0, 0, 0, 0.03)',
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
