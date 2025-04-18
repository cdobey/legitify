import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Anchor, Group, Text } from '@mantine/core';
import {
  IconCertificate,
  IconChevronRight,
  IconFileCheck,
  IconFiles,
  IconHome,
  IconInbox,
  IconSchool,
  IconSettings,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  title: string;
  path: string;
  icon?: ReactNode;
  isClickable: boolean;
}

// Define valid routes structure with proper titles and icons
const routeConfig: Record<
  string,
  {
    title: string;
    icon: ReactNode;
    validPaths?: string[];
    isClickable: boolean;
    redirectPath?: string;
  }
> = {
  dashboard: {
    title: 'Dashboard',
    icon: <IconHome size={16} stroke={1.5} />,
    isClickable: true,
  },
  profile: {
    title: 'Profile',
    icon: <IconUser size={16} stroke={1.5} />,
    isClickable: true,
  },
  settings: {
    title: 'Settings',
    icon: <IconSettings size={16} stroke={1.5} />,
    isClickable: true,
  },
  degree: {
    title: 'Degrees',
    icon: <IconCertificate size={16} stroke={1.5} />,
    validPaths: ['issue', 'manage', 'requests', 'verify', 'accessible', 'all-records', 'view'],
    isClickable: false, // The /degree route doesn't exist as a page
    redirectPath: '/dashboard', // Redirect to dashboard if clicked
  },
  universities: {
    title: 'Universities',
    icon: <IconSchool size={16} stroke={1.5} />,
    validPaths: ['manage'],
    isClickable: false, // Mark universities as non-clickable
    redirectPath: '/dashboard',
  },
  users: {
    title: 'Users',
    icon: <IconUser size={16} stroke={1.5} />,
    validPaths: ['search'],
    isClickable: false, // The /users route doesn't exist
    redirectPath: '/dashboard',
  },
};

// Define titles for second-level paths
const subPathTitles: Record<string, { title: string; icon: ReactNode }> = {
  issue: {
    title: 'Issue Degree',
    icon: <IconCertificate size={16} stroke={1.5} />,
  },
  manage: {
    title: 'Manage',
    icon: <IconFiles size={16} stroke={1.5} />,
  },
  requests: {
    title: 'Access Requests',
    icon: <IconInbox size={16} stroke={1.5} />,
  },
  verify: {
    title: 'Verify',
    icon: <IconFileCheck size={16} stroke={1.5} />,
  },
  accessible: {
    title: 'Accessible Degrees',
    icon: <IconFiles size={16} stroke={1.5} />,
  },
  'all-records': {
    title: 'All Records',
    icon: <IconFiles size={16} stroke={1.5} />,
  },
  search: {
    title: 'Search',
    icon: <IconUserPlus size={16} stroke={1.5} />,
  },
  view: {
    title: 'View Certificate',
    icon: <IconFileCheck size={16} stroke={1.5} />,
  },
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  // Function to check if a path is valid based on user role
  const isPathValid = (path: string): boolean => {
    // Skip validation for home and direct routes
    if (path === '/' || path === '/dashboard' || path === '/profile' || path === '/settings') {
      return true;
    }

    const segments = path.split('/').filter(Boolean);

    // First level validation (e.g., /degree, /universities, /users)
    if (segments.length === 1) {
      return routeConfig[segments[0]] !== undefined;
    }

    // Second level validation (e.g., /degree/issue, /universities/manage)
    if (segments.length >= 2) {
      const parentRoute = routeConfig[segments[0]];

      // If parent doesn't exist or doesn't have valid subpaths, return false
      if (!parentRoute || !parentRoute.validPaths) {
        return false;
      }

      // For paths with ID parameters (e.g., /degree/view/abc123)
      if (segments[0] === 'degree' && segments[1] === 'view' && segments.length === 3) {
        return true;
      }

      // Check if the subpath is valid
      return parentRoute.validPaths.includes(segments[1]);
    }

    return false;
  };

  // Function to generate breadcrumb items based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const searchParams = new URLSearchParams(location.search);

    // Always start with home
    const breadcrumbs: BreadcrumbItem[] = [
      {
        title: 'Home',
        path: user ? '/dashboard' : '/',
        icon: <IconHome size={16} stroke={1.5} />,
        isClickable: true,
      },
    ];

    // Skip adding more breadcrumbs if we're already on the home page
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      return breadcrumbs;
    }

    // Special handling for certificate view to maintain context
    if (pathSegments[0] === 'degree' && pathSegments[1] === 'view' && pathSegments.length === 3) {
      // Add Degrees category
      breadcrumbs.push({
        title: 'Degrees',
        path: '/dashboard',
        icon: <IconCertificate size={16} stroke={1.5} />,
        isClickable: false,
      });

      // Add Accessible Degrees with back link
      breadcrumbs.push({
        title: 'Accessible Degrees',
        path: '/degree/accessible',
        icon: <IconFiles size={16} stroke={1.5} />,
        isClickable: true,
      });

      // Add the certificate itself
      breadcrumbs.push({
        title: 'View Certificate',
        path: location.pathname,
        icon: <IconFileCheck size={16} stroke={1.5} />,
        isClickable: true,
      });

      return breadcrumbs;
    }

    // Regular breadcrumb generation for other pages
    let currentPath = '';

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];

      if (i === 0 && segment === 'dashboard') continue;

      currentPath += `/${segment}`;

      // Skip invalid paths
      if (!isPathValid(currentPath)) {
        continue;
      }

      // Special case for document IDs in URLs like /degree/view/:docId
      if (
        i === 2 &&
        pathSegments[0] === 'degree' &&
        pathSegments[1] === 'view' &&
        segment.length > 10
      ) {
        breadcrumbs.push({
          title: 'Certificate',
          path: currentPath,
          icon: <IconFileCheck size={16} stroke={1.5} />,
          isClickable: true,
        });
        continue;
      }

      let title: string;
      let icon: ReactNode | undefined;
      let isClickable = true;
      let redirectPath: string | undefined;

      // First segment (top-level route)
      if (i === 0) {
        const routeInfo = routeConfig[segment];
        if (routeInfo) {
          title = routeInfo.title;
          icon = routeInfo.icon;
          isClickable = routeInfo.isClickable;
          redirectPath = routeInfo.redirectPath;
        } else {
          title = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      }
      // Second segment (sub-route)
      else if (i === 1) {
        const subRouteInfo = subPathTitles[segment];
        if (subRouteInfo) {
          title = subRouteInfo.title;
          icon = subRouteInfo.icon;
        } else {
          title = segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      }
      // Default for any other segments
      else {
        title = segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      breadcrumbs.push({
        title,
        path: redirectPath || currentPath,
        icon,
        isClickable,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // If we only have one breadcrumb (homepage), don't render anything
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Group className="breadcrumbs-container" gap={8} px="lg" py={8}>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <Group key={`${crumb.path}-${crumb.title}-${index}`} gap={8}>
            {index > 0 && (
              <IconChevronRight
                size={14}
                style={{
                  color: isDarkMode ? '#6c757d' : '#adb5bd',
                  opacity: 0.7,
                }}
              />
            )}

            {isLast || !crumb.isClickable ? (
              <Text
                size="sm"
                fw={500}
                style={{
                  color: isDarkMode
                    ? isLast
                      ? '#e9ecef'
                      : '#6c757d'
                    : isLast
                    ? '#212529'
                    : '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: !crumb.isClickable && !isLast ? 0.7 : 1,
                }}
              >
                {crumb.icon && (
                  <span style={{ display: 'flex', alignItems: 'center' }}>{crumb.icon}</span>
                )}
                {crumb.title}
              </Text>
            ) : (
              <Anchor
                component={Link}
                to={crumb.path}
                size="sm"
                style={{
                  color: isDarkMode ? '#adb5bd' : '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
                className="breadcrumb-link"
              >
                {crumb.icon && (
                  <span style={{ display: 'flex', alignItems: 'center' }}>{crumb.icon}</span>
                )}
                {crumb.title}
              </Anchor>
            )}
          </Group>
        );
      })}
    </Group>
  );
}
