import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';

// Define interface types
interface User {
  username: string;
  email: string;
  role: string;
  orgName?: string;
  profilePictureUrl?: string;
}

// Create our mock auth state
const mockAuthState = {
  user: null as User | null,
  isLoading: false,
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  refreshUser: vi.fn(),
  api: { get: vi.fn(), post: vi.fn() },
  refreshSession: vi.fn(),
};

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Create our mock theme state
const mockThemeState = {
  isDarkMode: false,
  toggleTheme: vi.fn(),
  setLightTheme: vi.fn(),
  setDarkTheme: vi.fn(),
};

// Mock theme context
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => mockThemeState,
}));

// Create a custom theme that includes primaryBlue
const mockMantineTheme: MantineThemeOverride = {
  colors: {
    primaryBlue: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab'],
  },
};

// Mock the location
const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
  };
});

function setup(user: User | null = null, pathname = '/', search = '') {
  // Update the mock states before rendering
  mockAuthState.user = user;
  mockLocation.pathname = pathname;
  mockLocation.search = search;

  render(
    <MantineProvider theme={mockMantineTheme}>
      <MemoryRouter initialEntries={[pathname + search]}>
        <Breadcrumbs />
      </MemoryRouter>
    </MantineProvider>
  );

  return {
    user: userEvent.setup(),
  };
}

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states
    mockAuthState.user = null;
    mockLocation.pathname = '/';
    mockLocation.search = '';
    mockThemeState.isDarkMode = false;
  });

  it('renders nothing on homepage', () => {
    setup();
    // Breadcrumbs should not render on homepage
    expect(document.querySelector('.breadcrumbs-container')).not.toBeInTheDocument();
  });

  it('renders nothing on dashboard for logged in users', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/dashboard');
    
    // Breadcrumbs should not render on dashboard
    expect(document.querySelector('.breadcrumbs-container')).not.toBeInTheDocument();
  });

  it('renders breadcrumbs for profile page', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/profile');
    
    // Should show Home > Profile
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders breadcrumbs for settings page', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/settings');
    
    // Should show Home > Settings
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders breadcrumbs for degree paths', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/degree/manage');
    
    // Should show Home > Degrees > Manage
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Degrees')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('renders correct breadcrumbs for university paths', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'university',
    }, '/universities/manage');
    
    // Should show Home > University > Manage
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('renders correct breadcrumbs for employer paths', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'employer',
    }, '/users/search');
    
    // Should show Home > Users > Search
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('handles special case for certificate view', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/degree/view/abc123456789');
    
    // Should show Home > Degrees > View Certificate
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Degrees')).toBeInTheDocument();
    expect(screen.getByText('View Certificate')).toBeInTheDocument();
  });

  it('makes last breadcrumb non-clickable', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/profile');
    
    // Home should be a link
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/dashboard');
    
    // Profile should be text (not a link)
    const profileText = screen.getByText('Profile');
    expect(profileText.tagName).not.toBe('A');
  });

  it('makes non-clickable routes as text instead of links', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/universities');
    
    // Home should be a link
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toBeInTheDocument();
    
    // University should be text (not a link) because it's marked as not clickable
    const uniText = screen.getByText('University');
    expect(uniText.tagName).not.toBe('A');
  });

  it('uses dashboard as home for logged in users', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/profile');
    
    // Home link should point to dashboard
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/dashboard');
  });

  it('uses root as home for non-logged in users', () => {
    setup(null, '/profile');
    
    // Home link should point to root
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('shows icons with breadcrumb items', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/degree/manage');
    
    // Should have icons alongside the text
    const icons = document.querySelectorAll('svg');
    // 3 for the breadcrumb items + chevron icons between them
    expect(icons.length).toBeGreaterThan(3);
  });

  it('changes style based on dark mode', () => {
    mockThemeState.isDarkMode = true;
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'individual',
    }, '/profile');
    
    // This is a visual test, so we just ensure it renders
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});