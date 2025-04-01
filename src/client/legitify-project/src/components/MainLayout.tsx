import { AppShell, Group, Title, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppNavigation from './AppNavigation';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const theme = useMantineTheme();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Scroll-aware header states
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  // Track scroll position and direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;

      // Determine if we should show or hide the header
      // When scrolling up OR at the top of the page, show the header
      // Otherwise hide it when scrolling down
      const shouldBeVisible = prevScrollPos > currentScrollPos || currentScrollPos < 50;

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

  // Add function to get page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') {
      return <img src="/header-image.png" alt="Header" style={{ height: '40px', marginTop: 10 }} />;
    }
    if (path === '/degree/issue') return 'Issue Degree';
    if (path === '/degree/manage') return 'Manage Degrees';
    if (path === '/degree/requests') return 'Access Requests';
    if (path === '/degree/verify') return 'Verify Degree';
    if (path === '/degree/accessible') return 'Accessible Degrees';
    if (path === '/profile') return 'Profile';
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
          transition: 'transform 0.3s ease, left 0.3s ease',
          backgroundColor: 'var(--background-light)',
          borderBottom: 'none',
          boxShadow: visible ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        <Group h="100%" px="md" style={{ justifyContent: 'space-between' }}>
          <div style={{ width: 80 }}></div>

          <Title order={3} c="primaryBlue">
            {getPageTitle()}
          </Title>

          <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end', paddingRight: 0 }}>
            <AppHeader />
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Main
        className="bg-pattern"
        style={{
          marginLeft: navCollapsed ? 80 : 280,
          marginTop: 60, // Add back margin for the header
          width: 'auto',
          transition: 'margin-left 0.3s ease',
          backgroundColor: 'var(--background-light)',
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
