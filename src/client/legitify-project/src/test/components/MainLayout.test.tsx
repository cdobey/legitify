import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MainLayout from '../../components/MainLayout';

interface User {
  username: string;
  email: string;
  role: string;
  orgName?: string;
  profilePictureUrl?: string;
}

const mockToggle = vi.fn();
const mockClose = vi.fn();

// Mock mantine hooks
vi.mock('@mantine/hooks', () => ({
  useDisclosure: () => [false, { toggle: mockToggle, close: mockClose }],
}));

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

interface AppNavigationProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// Mock the components used by MainLayout
vi.mock('../../components/AppHeader', () => ({
  default: () => <div data-testid="app-header">App Header Mock</div>,
}));

// Mock AppNavigation component to better match actual implementation
vi.mock('../../components/AppNavigation', () => ({
  default: ({ collapsed, onToggleCollapse }: AppNavigationProps) => (
    <div data-testid="app-navigation">
      <button
        className="mantine-focus-auto mantine-Burger-root"
        aria-label="Toggle navigation"
        data-testid="toggle-nav"
        onClick={onToggleCollapse}
      >
        Toggle Navigation
      </button>
      <div data-testid="nav-collapsed-state">{collapsed ? 'collapsed' : 'expanded'}</div>
    </div>
  ),
}));

vi.mock('../../components/Breadcrumbs', () => ({
  default: () => (
    <div data-testid="breadcrumbs" style={{ backgroundColor: 'rgba(249, 250, 251, 0.7)' }}>
      Breadcrumbs Mock
    </div>
  ),
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

// Mock window methods
const originalScrollY = window.scrollY;
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

function setup(user: User | null = null, pathname = '/') {
  // Update the mock states before rendering
  mockAuthState.user = user;
  mockLocation.pathname = pathname;

  render(
    <MantineProvider theme={mockMantineTheme}>
      <MemoryRouter initialEntries={[pathname]}>
        <MainLayout>
          <div data-testid="layout-children">Layout Children Content</div>
        </MainLayout>
      </MemoryRouter>
    </MantineProvider>,
  );

  return {
    user: userEvent.setup(),
  };
}

describe('MainLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock states
    mockAuthState.user = null;
    mockLocation.pathname = '/';
    mockThemeState.isDarkMode = false;

    // Reset window.scrollY and event listeners
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0,
    });

    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    // Restore original window properties
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: originalScrollY,
    });

    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it('renders the layout with children content', () => {
    setup();
    expect(screen.getByTestId('layout-children')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-navigation')).toBeInTheDocument();
  });

  it('starts with collapsed navigation by default', () => {
    setup();
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('collapsed');
  });

  it('toggles navigation when toggle button is clicked', async () => {
    const { user } = setup();

    // Initially collapsed
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('collapsed');

    // Click toggle button
    await user.click(screen.getByTestId('toggle-nav'));

    // Should be expanded now
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('expanded');

    // Click toggle button again
    await user.click(screen.getByTestId('toggle-nav'));

    // Should be collapsed again
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('collapsed');
  });

  it('renders breadcrumbs for non-home pages', () => {
    setup(null, '/profile');
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  it('does not render breadcrumbs for home page', () => {
    setup(null, '/');
    expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
  });

  it('sets up scroll event listener on mount', () => {
    setup();
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('removes scroll event listener on unmount', () => {
    const { unmount } = render(
      <MantineProvider theme={mockMantineTheme}>
        <MemoryRouter>
          <MainLayout>
            <div>Layout Children Content</div>
          </MainLayout>
        </MemoryRouter>
      </MantineProvider>,
    );

    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('displays correct page title for dashboard', () => {
    setup(null, '/dashboard');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays correct page title for profile', () => {
    setup(null, '/profile');
    expect(screen.getByText('Profile', { selector: '.header-title' })).toBeInTheDocument();
  });

  it('displays correct page title for settings', () => {
    setup(null, '/settings');
    expect(screen.getByText('Settings', { selector: '.header-title' })).toBeInTheDocument();
  });

  it('displays correct page title for credential management', () => {
    setup(null, '/credential/manage');
    expect(
      screen.getByText('Manage Credentials', { selector: '.header-title' }),
    ).toBeInTheDocument();
  });

  it('displays correct page title for issuer management', () => {
    setup(null, '/issuer/manage');
    expect(screen.getByText('Manage Issuer', { selector: '.header-title' })).toBeInTheDocument();
  });

  it('displays correct page description for dashboard', () => {
    setup(null, '/dashboard');
    expect(screen.getByText('Manage your academic credentials')).toBeInTheDocument();
  });

  it('displays correct page description for profile', () => {
    setup(null, '/profile');
    expect(screen.getByText('View and manage your profile information')).toBeInTheDocument();
  });

  it('applies different styling in dark mode', () => {
    mockThemeState.isDarkMode = true;
    setup(null, '/dashboard');

    // Just checking that the component renders in dark mode
    expect(screen.getByTestId('layout-children')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows appropriate icon for different pages', () => {
    setup(null, '/dashboard');
    const headerIcon = document.querySelector('.header-icon');
    expect(headerIcon).toBeInTheDocument();
  });

  it('displays different title for credentials based on user role', () => {
    setup(
      {
        username: 'verifieruser',
        email: 'verifier@example.com',
        role: 'verifier',
      },
      '/credentials',
    );

    expect(screen.getByText('Accessible Credentials')).toBeInTheDocument();

    // Change user to holder
    setup(
      {
        username: 'holderuser',
        email: 'holder@example.com',
        role: 'holder',
      },
      '/credentials',
    );

    expect(screen.getByText('Blockchain Records')).toBeInTheDocument();
  });

  it('collapses sidebar when clicking outside', () => {
    setup();

    // First expand the sidebar
    fireEvent.click(screen.getByTestId('toggle-nav'));
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('expanded');

    // Simulate a click outside
    fireEvent.mouseDown(document.body);

    // The sidebar should be collapsed again
    expect(screen.getByTestId('nav-collapsed-state')).toHaveTextContent('collapsed');
  });
});
