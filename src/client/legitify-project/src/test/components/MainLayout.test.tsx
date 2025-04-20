import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';

// Mock the necessary hooks and components before importing the component under test
vi.mock('@mantine/hooks', () => ({
  useDisclosure: () => [false, { toggle: vi.fn(), close: vi.fn() }],
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: false,
  }),
}));

// Mock the child components completely
vi.mock('../../components/AppHeader', () => ({
  default: () => <div data-testid="app-header">Mock Header</div>,
}));

vi.mock('../../components/AppNavigation', () => ({
  default: () => <div data-testid="app-navigation">Mock Navigation</div>,
}));

vi.mock('../../components/Breadcrumbs', () => ({
  default: () => <div data-testid="breadcrumbs">Mock Breadcrumbs</div>,
}));

// Mock useLocation
const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
  };
});

// Import the component after mocks are set up
import MainLayout from '../../components/MainLayout';

// Create a custom theme
const mockMantineTheme: MantineThemeOverride = {
  colors: {
    primaryBlue: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab'],
  },
};

describe('MainLayout Component', () => {
  beforeEach(() => {
    // Reset location pathname before each test
    mockLocation.pathname = '/';
    
    // Mock window methods that are used in the component
    window.scrollY = 0;
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  it('renders the child components correctly', () => {
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div data-testid="test-children">Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    // Verify the layout structure
    expect(screen.getByTestId('app-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
  });

  it('does not render breadcrumbs on home page', () => {
    mockLocation.pathname = '/';
    
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    // Breadcrumbs should not be rendered on home page
    expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
  });

  it('renders breadcrumbs on non-home pages', () => {
    mockLocation.pathname = '/profile';
    
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    // Breadcrumbs should be rendered on non-home pages
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  it('sets up scroll event listener on mount', () => {
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    // Should set up a scroll event listener
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('cleans up scroll event listener on unmount', () => {
    const { unmount } = render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    unmount();
    
    // Should remove the scroll event listener on unmount
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('displays the correct header title based on the route', () => {
    // Test profile route
    mockLocation.pathname = '/profile';
    
    const { unmount } = render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    const headerTitle = document.querySelector('.header-title');
    expect(headerTitle).toHaveTextContent('Profile');
    
    // Clean up
    unmount();
    
    // Test dashboard route
    mockLocation.pathname = '/dashboard';
    
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    const dashboardTitle = document.querySelector('.header-title');
    expect(dashboardTitle).toHaveTextContent('Dashboard');
  });

  it('displays the correct page description based on the route', () => {
    mockLocation.pathname = '/profile';
    
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    const headerSubtitle = document.querySelector('.header-subtitle');
    expect(headerSubtitle).toHaveTextContent('View and manage your profile information');
  });

  it('renders the appropriate icon for the current page', () => {
    mockLocation.pathname = '/dashboard';
    
    render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Test Children</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>
    );

    // Just verify the icon container is present (actual icon testing is complex)
    const headerIcon = document.querySelector('.header-icon');
    expect(headerIcon).toBeInTheDocument();
  });
});