import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Settings from '@/pages/Settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// --- Mock Auth Context ---
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

// Patch useAuth to use our mock context
vi.mock('@/contexts/AuthContext', async (importOriginal: () => Promise<any>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => React.useContext(AuthContext),
  };
});

// --- Mock Theme Context ---
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

// --- Mock API Mutations ---
vi.mock('@/api/users/user.mutations', () => ({
  useUpdateProfileMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useChangePasswordMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useUploadProfilePictureMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeleteProfilePictureMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useEnableTwoFactorMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      qrCode: 'data:image/png;base64,mockedQRCode',
      secret: 'MOCKEDSECRET',
    }),
    isPending: false,
  }),
  useVerifyTwoFactorMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDisableTwoFactorMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// --- Mock University API Queries and Mutations ---
vi.mock('@/api/universities/university.queries', () => ({
  useMyUniversitiesQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled
      ? [
          {
            id: 'uni-1',
            displayName: 'Test University',
            logoUrl: 'https://example.com/logo.png',
          },
        ]
      : [],
  }),
}));

vi.mock('@/api/universities/university.mutations', () => ({
  useUploadUniversityLogoMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeleteUniversityLogoMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// --- Mock Degree API Queries ---
vi.mock('@/api/degrees/degree.queries', () => ({
  useMyDegreesQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled ? [{ id: 'degree-1', title: 'Bachelor of Science' }] : [],
  }),
  useAccessRequestsQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled ? [{ id: 'request-1', status: 'pending' }] : [],
  }),
  useLedgerRecordsQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled
      ? [
          {
            id: 'record-1',
            issuedAt: '2025-04-10T10:00:00Z',
          },
        ]
      : [],
  }),
  useAccessibleDegreesQuery: ({ enabled }: { enabled: boolean }) => ({
    data: enabled
      ? [
          {
            id: 'degree-1',
            owner: {
              email: 'student@example.com',
            },
          },
        ]
      : [],
  }),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

function renderSettingsWithProviders(user: any) {
  const queryClient = new QueryClient();
  return render(
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
  );
}

// Sample users for testing different roles
const universityUser = {
  id: 'u1',
  email: 'uni@example.com',
  role: 'university',
  username: 'universityUser',
  orgName: 'orguniversity',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  twoFactorEnabled: false,
};

const individualUser = {
  id: 'i1',
  email: 'ind@example.com',
  role: 'individual',
  username: 'individualUser',
  orgName: 'orgindividual',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  twoFactorEnabled: false,
  profilePictureUrl: 'https://example.com/profile.png',
};

const employerUser = {
  id: 'e1',
  email: 'emp@example.com',
  role: 'employer',
  username: 'employerUser',
  orgName: 'orgemployer',
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

  it('displays user profile information correctly for individual users', async () => {
    renderSettingsWithProviders(individualUser);

    expect(screen.getByText(individualUser.username)).toBeInTheDocument();
    expect(screen.getByText(individualUser.email)).toBeInTheDocument();

    const roleBadges = screen.getAllByText('Individual');
    const roleBadgeElement = roleBadges.find(
      element => element.closest('.mantine-Badge-root') !== null,
    );
    expect(roleBadgeElement).toBeInTheDocument();

    const orgBadges = screen.getAllByText(individualUser.orgName);
    const orgBadgeElement = orgBadges.find(
      element => element.closest('.mantine-Badge-root') !== null,
    );
    expect(orgBadgeElement).toBeInTheDocument();

    // Check tabs are present
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /preferences/i })).toBeInTheDocument();

    // Verify individual-specific stats are displayed
    expect(screen.getByText('Your Degrees')).toBeInTheDocument();
    expect(screen.getByText('Pending Access Requests')).toBeInTheDocument();

    // Find the value "1" that represents degree count
    const degreesCard = screen
      .getAllByText('Your Degrees')[0]
      .closest('.mantine-Card-root') as HTMLElement;
    expect(degreesCard).toBeInTheDocument();

    const degreeCountText = within(degreesCard).getByText('1');
    expect(degreeCountText).toBeInTheDocument();
  });

  it('displays university-specific tab and logo section for university users', async () => {
    renderSettingsWithProviders(universityUser);

    // Should have university tab
    expect(screen.getByRole('tab', { name: /university/i })).toBeInTheDocument();

    // Click on university tab
    await userEvent.click(screen.getByRole('tab', { name: /university/i }));

    // Should show university-specific content
    await waitFor(() => {
      expect(screen.getByText('University Logo')).toBeInTheDocument();
    });

    // Verify university-specific stats are displayed
    expect(screen.getByText('Issued Degrees')).toBeInTheDocument();
    expect(screen.getByText('Last Activity')).toBeInTheDocument();
  });

  it('displays employer-specific stats for employer users', () => {
    renderSettingsWithProviders(employerUser);

    // Verify employer-specific stats are displayed
    expect(screen.getByText('Unique Individuals')).toBeInTheDocument();
    expect(screen.getByText('Accessible Degrees')).toBeInTheDocument();
  });

  it('shows enabled 2FA interface for users with 2FA enabled', async () => {
    renderSettingsWithProviders(employerUser);

    // Click on security tab
    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    await waitFor(() => {
      expect(screen.getByText('Two-factor authentication is enabled')).toBeInTheDocument();
    });

    // Should have disable 2FA button
    expect(screen.getByRole('button', { name: /disable 2fa/i })).toBeInTheDocument();
  });

  it('shows setup 2FA interface for users without 2FA enabled', async () => {
    renderSettingsWithProviders(individualUser);

    // Click on security tab
    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    await waitFor(() => {
      expect(screen.getByText(/adds an extra layer of security/i)).toBeInTheDocument();
    });

    // Should have setup 2FA button
    expect(
      screen.getByRole('button', { name: /setup two-factor authentication/i }),
    ).toBeInTheDocument();
  });

  it('shows theme selection options in preferences tab', async () => {
    renderSettingsWithProviders(individualUser);

    // Click on preferences tab
    await userEvent.click(screen.getByRole('tab', { name: /preferences/i }));

    await waitFor(() => {
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    // Should have light/dark theme buttons
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
  });

  it('shows appropriate form fields in profile section', async () => {
    renderSettingsWithProviders(individualUser);

    // Profile section should be default active tab
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    // Email should be disabled as mentioned in component
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeDisabled();

    // Should show account information section
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Account Type')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Account Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();

    // Check dates are formatted correctly
    expect(screen.getByText('January 1, 2024')).toBeInTheDocument(); // createdAt
    expect(screen.getByText('January 2, 2024')).toBeInTheDocument(); // updatedAt
  });

  it('shows password change form in security tab', async () => {
    renderSettingsWithProviders(individualUser);

    // Click on security tab
    await userEvent.click(screen.getByRole('tab', { name: /security/i }));

    // Wait for the security tab to be active
    const securityPanel = await waitFor(() => {
      return screen.getByRole('tabpanel', { name: /security/i });
    });

    // Find the heading within the security tab panel
    const changePasswordHeading = within(securityPanel).getByRole('heading', {
      name: /change password/i,
    });
    expect(changePasswordHeading).toBeInTheDocument();

    // Should have password fields
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your new password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your new password')).toBeInTheDocument();

    // Change Password button should be present but disabled (since fields are empty)
    const changePasswordButton = screen.getByRole('button', { name: /^change password$/i });
    expect(changePasswordButton).toBeInTheDocument();
    expect(changePasswordButton).toBeDisabled();
  });
});
