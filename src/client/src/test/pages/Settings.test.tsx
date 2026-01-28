import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Settings from '@/pages/Settings';
import { QueryClient, QueryClientConfig, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  } satisfies QueryClientConfig);

let queryClient: QueryClient;

function renderSettingsWithProviders(user: any) {
  queryClient = createTestQueryClient();
  return {
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ModalsProvider>
              <MockAuthProvider user={user}>
                <Settings />
              </MockAuthProvider>
            </ModalsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ),
    queryClient,
  };
}

const AuthContext = React.createContext<any>(null);
function MockAuthProvider({ user, children }: { user: any; children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        refreshSession: vi.fn(),
        api: {},
        twoFactorState: { required: false },
        verifyTwoFactor: vi.fn(),
        clearTwoFactorState: vi.fn(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

vi.mock('@/contexts/AuthContext', async (importOriginal: () => Promise<any>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => React.useContext(AuthContext),
  };
});

vi.mock('@/contexts/ThemeContext', async (importOriginal: () => Promise<any>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTheme: () => ({
      isDarkMode: false,
      setLightTheme: vi.fn(),
      setDarkTheme: vi.fn(),
    }),
  };
});

// Coudlnt get MSW api mocks working correctly so for this component I'm just gonna use query mocking for now (REVISIT)
vi.mock('@/api/credentials/credential.queries', () => ({
  useMyCredentialsQuery: () => ({
    data: [{ id: 'cred-1', title: 'Mock Credential' }],
    isLoading: false,
    error: null,
    isFetching: false,
  }),
  useAccessRequestsQuery: () => ({
    data: [{ id: 'req-1', status: 'pending' }],
    isLoading: false,
    error: null,
    isFetching: false,
  }),
  useLedgerRecordsQuery: () => ({
    data: [{ id: 'ledger-1', ledgerTimestamp: new Date().toISOString() }],
    isLoading: false,
    error: null,
    isFetching: false,
  }),
  useAccessibleCredentialsQuery: () => ({
    data: [{ id: 'acc-1', holder: { email: 'holder@example.com' } }],
    isLoading: false,
    error: null,
    isFetching: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  if (queryClient) {
    queryClient.clear();
  }
});

const issuerUser = {
  id: 'u1',
  email: 'issuer@example.com',
  role: 'issuer',
  username: 'issuerUser',
  orgName: 'orgissuer',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  twoFactorEnabled: false,
};

const holderUser = {
  id: 'i1',
  email: 'holder@example.com',
  role: 'holder',
  username: 'holderUser',
  orgName: 'orgholder',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  twoFactorEnabled: false,
  profilePictureUrl: 'https://example.com/profile.png',
};

const verifierUser = {
  id: 'e1',
  email: 'verifier@example.com',
  role: 'verifier',
  username: 'verifierUser',
  orgName: 'orgverifier',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  twoFactorEnabled: true,
};

describe('Settings Page', () => {
  it('shows alert for unauthenticated users', () => {
    renderSettingsWithProviders(null);
    expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
    expect(screen.getByText(/you need to be logged in/i)).toBeInTheDocument();
  });

  it('displays user profile information correctly for holder users', async () => {
    renderSettingsWithProviders(holderUser);

    expect(screen.getByText(holderUser.username)).toBeInTheDocument();
    expect(screen.getByText(holderUser.email)).toBeInTheDocument();

    const roleBadges = screen.getAllByText('Holder');
    expect(roleBadges.find(el => el.closest('.mantine-Badge-root'))).toBeInTheDocument();

    const orgBadges = screen.getAllByText(holderUser.orgName);
    expect(orgBadges.find(el => el.closest('.mantine-Badge-root'))).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();

    expect(screen.getByText('Your Credentials')).toBeInTheDocument();
    expect(screen.getByText('Pending Access Requests')).toBeInTheDocument();

    const credentialCountElement = await screen.findByTestId(
      'stat-card-value-your-credentials',
      {},
      { timeout: 3000 },
    );
    expect(credentialCountElement).toHaveTextContent('1');

    const credentialsCard = screen
      .getAllByText('Your Credentials')[0]
      .closest('.mantine-Card-root') as HTMLElement;
    expect(credentialsCard).toBeInTheDocument();
    expect(
      within(credentialsCard).getByTestId('stat-card-value-your-credentials'),
    ).toHaveTextContent('1');
  });

  it('displays issuer-specific tab and logo section for issuer users', async () => {
    renderSettingsWithProviders(issuerUser);

    expect(screen.getByRole('tab', { name: /organization/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /organization/i }));

    await waitFor(() => expect(screen.getByText('Organization Branding')).toBeInTheDocument());

    expect(screen.getByText('Issued Credentials')).toBeInTheDocument();
    expect(screen.getByText('Last Activity')).toBeInTheDocument();
  });

  it('displays verifier-specific stats for verifier users', () => {
    renderSettingsWithProviders(verifierUser);
    expect(screen.getByText('Credential Holders')).toBeInTheDocument();
    expect(screen.getByText('Accessible Credentials')).toBeInTheDocument();
  });

  it('shows enabled 2FA interface for users with 2FA enabled', async () => {
    renderSettingsWithProviders(verifierUser);

    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    await waitFor(() =>
      expect(screen.getByText('Two-factor authentication is enabled')).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: /disable 2fa/i })).toBeInTheDocument();
  });

  it('shows setup 2FA interface for users without 2FA enabled', async () => {
    renderSettingsWithProviders(holderUser);

    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    await waitFor(() =>
      expect(screen.getByText(/adds an extra layer of security/i)).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', { name: /setup two-factor authentication/i }),
    ).toBeInTheDocument();
  });

  it('shows theme selection options in preferences tab', async () => {
    renderSettingsWithProviders(holderUser);

    await userEvent.click(screen.getByRole('tab', { name: /appearance/i }));

    await waitFor(() => expect(screen.getByText('Appearance')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
  });

  it('shows appropriate form fields in profile section', () => {
    renderSettingsWithProviders(holderUser);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeDisabled();

    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Account Type')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Account Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();

    expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('January 2, 2024')).toBeInTheDocument();
  });

  it('shows password change form in security tab', async () => {
    renderSettingsWithProviders(holderUser);

    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    const securityPanel = await waitFor(() => screen.getByRole('tabpanel', { name: /security/i }));

    expect(
      within(securityPanel).getByRole('heading', { name: /change password/i }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();

    const changePasswordButton = screen.getByRole('button', {
      name: /^change password$/i,
    });
    expect(changePasswordButton).toBeDisabled();
  });
});
