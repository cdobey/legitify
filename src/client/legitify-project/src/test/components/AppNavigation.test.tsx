import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppNavigation from '../../components/AppNavigation'; // Adjust the path as needed

// Define interface types
interface User {
  username: string;
  email: string;
  role: string;
  orgName?: string;
  profilePictureUrl?: string;
}

// Mock the necessary modules and hooks
const mockLogout = vi.fn().mockResolvedValue(undefined);
const mockToggleCollapse = vi.fn();

// Create our mock auth state
const mockAuthState = {
  user: null as User | null,
  isLoading: false,
  logout: mockLogout,
  login: vi.fn(),
  register: vi.fn(),
  refreshUser: vi.fn(),
  api: { get: vi.fn(), post: vi.fn() },
  refreshSession: vi.fn(),
};

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
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
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => mockThemeState,
}));

// Create a custom theme that includes primaryBlue
const mockMantineTheme: MantineThemeOverride = {
  colors: {
    primaryBlue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
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

function setup(user: User | null = null, collapsed = false, pathname = '/') {
  // Update the mock states before rendering
  mockAuthState.user = user;
  mockLocation.pathname = pathname;

  render(
    <MantineProvider theme={mockMantineTheme}>
      <MemoryRouter initialEntries={[pathname]}>
        <AppNavigation collapsed={collapsed} onToggleCollapse={mockToggleCollapse} />
      </MemoryRouter>
    </MantineProvider>,
  );

  return {
    user: userEvent.setup(),
  };
}

describe('AppNavigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states
    mockAuthState.user = null;
    mockLocation.pathname = '/';
  });

  it('renders the common links for non-logged in users', () => {
    setup();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('renders collapsed navigation with minimal text', () => {
    setup(null, true);
    // In collapsed mode, text labels should not be visible
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    // But icons should be present
    const links = document.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('displays issuer-specific links for issuer users', () => {
    setup({
      username: 'issuer1',
      email: 'uni@example.com',
      role: 'issuer',
    });

    expect(screen.getByText('Issue Credential')).toBeInTheDocument();
    expect(screen.getByText('Manage Issuer')).toBeInTheDocument();
  });

  it('displays holder-specific links for holder users', () => {
    setup({
      username: 'holderuser',
      email: 'holder@example.com',
      role: 'holder',
    });

    expect(screen.getByText('My Credentials')).toBeInTheDocument();
    expect(screen.getByText('My Issuers')).toBeInTheDocument();
    expect(screen.getByText('Access Requests')).toBeInTheDocument();
  });

  it('displays verifier-specific links for verifier users', () => {
    setup({
      username: 'verifieruser',
      email: 'verifier@example.com',
      role: 'verifier',
    });

    expect(screen.getByText('Verify Credential')).toBeInTheDocument();
    expect(screen.getByText('Search Users')).toBeInTheDocument();
    expect(screen.getByText('Accessible Credentials')).toBeInTheDocument();
  });

  it('highlights the active link based on current location', () => {
    setup(
      {
        username: 'holderuser',
        email: 'holder@example.com',
        role: 'holder',
      },
      false,
      '/credential/manage',
    );

    // Find the NavLink for My Credentials
    const myCredentialsLink = screen.getByText('My Credentials').closest('a');

    // Instead of checking for a specific class, check for data-active attribute or aria-current
    expect(myCredentialsLink).toHaveAttribute('data-active', 'true');
  });

  it('displays user avatar and username in expanded mode when logged in', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
    });

    expect(screen.getByText('testuser')).toBeInTheDocument();
    // Avatar should display the first letter of username
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows logout button for logged in users', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
    });

    const logoutButton = screen.getByText('Logout');
    expect(logoutButton).toBeInTheDocument();
  });

  it('calls onToggleCollapse when burger button is clicked', async () => {
    const { user } = setup();

    const burgerButton = screen.getByLabelText('Toggle navigation');
    await user.click(burgerButton);

    expect(mockToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('renders company logo in expanded mode', () => {
    setup();

    // Logo is an image with alt text
    const logo = screen.getByAltText('LegiTify Logo');
    expect(logo).toBeInTheDocument();
  });

  it('does not render logo in collapsed mode', () => {
    setup(null, true);

    // Logo should not be present in collapsed mode
    expect(screen.queryByAltText('LegiTify Logo')).not.toBeInTheDocument();
  });

  it('calls logout function when logout button is clicked', async () => {
    const { user } = setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
    });

    const logoutButton = screen.getByText('Logout');
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('displays section headers only in expanded mode', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
    });

    // Section headers should be visible in expanded mode
    expect(screen.getByText('HOLDER ACTIONS')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT')).toBeInTheDocument();
  });

  it('does not display section headers in collapsed mode', () => {
    setup(
      {
        username: 'testuser',
        email: 'test@example.com',
        role: 'holder',
      },
      true,
    );

    // Section headers should not be visible in collapsed mode
    expect(screen.queryByText('HOLDER ACTIONS')).not.toBeInTheDocument();
    expect(screen.queryByText('ACCOUNT')).not.toBeInTheDocument();
  });

  it('renders profile picture when available', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
      profilePictureUrl: 'https://example.com/profile.jpg',
    });

    // Profile picture should be rendered as img in the avatar
    const avatar = document.querySelector('.mantine-Avatar-root img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/profile.jpg');
  });

  it('renders settings link for all logged-in users', () => {
    setup({
      username: 'testuser',
      email: 'test@example.com',
      role: 'holder',
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
