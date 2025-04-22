import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ManageIssuer from '@/pages/issuer/ManageIssuer';
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

vi.mock('@/contexts/AuthContext', async (importOriginal: () => Promise<any>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => React.useContext(AuthContext),
  };
});

// Create mock functions for react-query hooks
const mockUseMyIssuersQuery = vi.fn();
const mockUseAllIssuersQuery = vi.fn();
const mockUsePendingAffiliationsQuery = vi.fn();
const mockUseRecentIssuedCredentialsQuery = vi.fn();
const mockUsePrimaryIssuerQuery = vi.fn();
const mockUseMyPendingJoinRequestsQuery = vi.fn();

// --- Mock Issuer API Queries ---
vi.mock('@/api/issuers/issuer.queries', () => ({
  useMyIssuersQuery: (...args: any[]) => mockUseMyIssuersQuery(...args),
  useAllIssuersQuery: (...args: any[]) => mockUseAllIssuersQuery(...args),
  usePendingAffiliationsQuery: (...args: any[]) => mockUsePendingAffiliationsQuery(...args),
  usePrimaryIssuerQuery: (...args: any[]) => mockUsePrimaryIssuerQuery(...args),
  useMyPendingJoinRequestsQuery: (...args: any[]) => mockUseMyPendingJoinRequestsQuery(...args),
  issuerKeys: {
    my: () => ['issuers', 'my'],
    pendingAffiliations: () => ['issuers', 'pending-affiliations'],
    pendingJoinRequests: () => ['issuers', 'pending-join-requests'],
    myPendingJoinRequests: () => ['issuers', 'my-pending-join-requests'],
    holderAffiliations: () => ['issuers', 'holder-affiliations'],
  },
  usePendingJoinRequestsQuery: vi.fn().mockReturnValue({
    data: [
      {
        id: 'req-1',
        status: 'pending',
        createdAt: '2025-01-01T00:00:00Z',
        requester: { username: 'issuerAdmin1', email: 'admin1@example.com' },
      },
      {
        id: 'req-2',
        status: 'pending',
        createdAt: '2025-01-02T00:00:00Z',
        requester: { username: 'issuerAdmin2', email: 'admin2@example.com' },
      },
    ],
    isLoading: false,
  }),
}));

// --- Mock Issuer API Mutations ---
vi.mock('@/api/issuers/issuer.mutations', () => ({
  useCreateIssuerMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      issuer: {
        id: 'new-uni-1',
        displayName: 'New Test Issuer',
        name: 'new-test-issuer',
        description: 'Test description',
        affiliations: [],
      },
    }),
    isPending: false,
  }),
  useJoinIssuerMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useAddHolderMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useRegisterHolderMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      success: true,
      username: 'newholder',
    }),
    isPending: false,
  }),
  useRespondToAffiliationMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useRespondToJoinRequestMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      message: 'Join request processed successfully',
      request: { id: 'req-1', status: 'accepted' },
    }),
    isPending: false,
  }),
}));

// --- Mock Credential API Queries ---
vi.mock('@/api/credentials/credential.queries', () => ({
  useRecentIssuedCredentialsQuery: (...args: any[]) => mockUseRecentIssuedCredentialsQuery(...args),
}));

// Custom render function with providers
function renderWithProviders(user: any = null, issuerData: any[] = []) {
  mockUseMyIssuersQuery.mockReturnValue({
    data: issuerData,
    isLoading: false,
    error: null,
  });

  mockUseAllIssuersQuery.mockReturnValue({
    data: [
      { id: 'uni-1', displayName: 'Test Issuer' },
      { id: 'uni-2', displayName: 'Another Issuer' },
    ],
    isLoading: false,
  });

  mockUsePendingAffiliationsQuery.mockReturnValue({
    data: [
      {
        id: 'aff-1',
        status: 'pending',
        initiatedBy: 'holder',
        createdAt: '2025-01-01T00:00:00Z',
        user: { username: 'holder1', email: 'holder1@example.com' },
      },
      {
        id: 'aff-2',
        status: 'pending',
        initiatedBy: 'issuer',
        createdAt: '2025-01-01T00:00:00Z',
        user: { username: 'holder2', email: 'holder2@example.com' },
      },
    ],
    isLoading: false,
  });

  mockUseRecentIssuedCredentialsQuery.mockReturnValue({
    data: [
      {
        docId: 'credential-1',
        recipientName: 'Holder A',
        issuedTo: 'holder.a@example.com',
        status: 'accepted',
        issueDate: '2025-03-15T10:00:00Z',
      },
      {
        docId: 'credential-2',
        recipientName: 'Holder B',
        issuedTo: 'holder.b@example.com',
        status: 'pending',
        issueDate: '2025-03-10T10:00:00Z',
      },
    ],
    isLoading: false,
  });

  mockUsePrimaryIssuerQuery.mockReturnValue({
    data: issuerData.length > 0 ? issuerData[0] : null,
    isLoading: false,
    error: null,
  });

  mockUseMyPendingJoinRequestsQuery.mockReturnValue({
    data: [
      {
        id: 'join-req-1',
        status: 'pending',
        createdAt: '2025-01-15T00:00:00Z',
        issuer: { id: 'uni-3', displayName: 'Pending Join Issuer' },
      },
    ],
    isLoading: false,
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ModalsProvider>
            <MockAuthProvider user={user}>
              <ManageIssuer />
            </MockAuthProvider>
          </ModalsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ManageIssuer component', () => {
  const issuerUser = {
    id: 'u1',
    email: 'uni@example.com',
    role: 'issuer',
    username: 'issuerUser',
  };

  const sampleIssuer = {
    id: 'uni-1',
    name: 'test-issuer',
    shorthand: 'Test Issuer',
    displayName: 'Test Issuer University',
    description: 'Test issuer description',
    affiliations: [
      {
        id: 'aff-active-1',
        status: 'active',
        user: { username: 'activeHolder', email: 'active@holder.com' },
      },
    ],
  };

  it('shows create/join options when user has no issuer', async () => {
    renderWithProviders(issuerUser);

    // Should show the alert about not having a issuer
    expect(screen.getByText(/you don't have a issuer affiliation yet/i)).toBeInTheDocument();

    // Should show create and join buttons
    expect(screen.getByRole('button', { name: /create issuer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join existing issuer/i })).toBeInTheDocument();
  });

  it('opens and validates the create issuer modal', async () => {
    renderWithProviders(issuerUser);

    // open modal
    await userEvent.click(screen.getByRole('button', { name: /create issuer/i }));

    // Wait for modal and elements inside it to appear
    await screen.findByTestId('create-issuer-modal');
    const nameInput = await screen.findByTestId('issuer-name-input');
    const shortnameInput = await screen.findByTestId('issuer-shortname-input');

    // Find the form within the document (Mantine modals often portal content)
    const form = await screen.findByRole('form');

    // Find the submit button *within the form*
    const createButton = await within(form).findByRole('button', { name: /^create issuer$/i });
    await userEvent.click(createButton);

    // validation errors
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Short name is required')).toBeInTheDocument();
    });
  });

  it('displays issuer dashboard when user has a issuer', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Should show the issuer name in a heading
    await waitFor(() => {
      expect(screen.getByText(sampleIssuer.shorthand)).toBeInTheDocument();
    });

    // Should show the issuer ID
    expect(screen.getByText(/ID: uni-1/i)).toBeInTheDocument();

    // Should show dashboard info
    await waitFor(() => {
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    // Check for holder management section
    expect(screen.getByText(/holder management/i)).toBeInTheDocument();

    // Check that we have the expected tabs
    expect(screen.getByRole('tab', { name: /actions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /affiliated/i })).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(
      tabs.some(tab => {
        const label = tab.querySelector('.mantine-Tabs-tabLabel');
        return label && label.textContent === 'Join Requests';
      }),
    ).toBe(true);

    expect(screen.getByRole('tab', { name: /sent invitations/i })).toBeInTheDocument();
  });

  it('displays active holders in the holders tab', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);
    await userEvent.click(screen.getByRole('tab', { name: /affiliated/i }));
    const tabPanel = await waitFor(() => {
      const panel = screen.getByRole('tabpanel');
      expect(panel).toBeInTheDocument();
      return panel;
    });

    const affiliatedTable = within(tabPanel).getByRole('table');

    // Find the activeHolder in the table
    const holderElement = within(affiliatedTable).getByText('activeHolder');
    expect(holderElement).toBeInTheDocument();

    const activeHolderRow = holderElement.closest('tr');
    expect(activeHolderRow).not.toBeNull();

    if (activeHolderRow) {
      const cells = within(activeHolderRow).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('activeHolder');
      expect(cells[1]).toHaveTextContent('active@holder.com');
      expect(cells[2]).toHaveTextContent('Active');
    }
  });

  it('can switch to join requests tab and display pending requests', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Wait for tabs to be loaded
    await waitFor(() => {
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole('tab');
    const joinRequestsTab = tabs.find(tab => {
      const label = tab.querySelector('.mantine-Tabs-tabLabel');
      return label && label.textContent === 'Join Requests';
    });

    // Check that we found the tab
    expect(joinRequestsTab).toBeTruthy();

    // Click the tab
    await userEvent.click(joinRequestsTab!);

    // Should show the pending requests content
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(
        within(tabPanel).getByText(/review and respond to holders requesting to join/i),
      ).toBeInTheDocument();
    });

    // Find specific table cell for holder name to avoid ambiguity
    const table = within(tabPanel).getByRole('table');
    const rows = within(table).getAllByRole('row');
    // Skip header row (index 0)
    const holderCell = within(rows[1]).getAllByRole('cell')[0];
    expect(holderCell).toHaveTextContent('holder1');

    // Should show approve/reject buttons
    expect(within(tabPanel).getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(within(tabPanel).getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('can switch to sent invitations tab and display pending invitations', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Click on the sent invitations tab
    await userEvent.click(screen.getByRole('tab', { name: /sent invitations/i }));

    // Should show the pending invitations content
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(within(tabPanel).getByText(/you've invited these holders/i)).toBeInTheDocument();
    });

    // Find specific table cell for holder name to avoid ambiguity
    const table = within(tabPanel).getByRole('table');
    const rows = within(table).getAllByRole('row');
    const holderCell = within(rows[1]).getAllByRole('cell')[0];
    expect(holderCell).toHaveTextContent('holder2');

    // Should show pending status
    expect(within(tabPanel).getByText(/awaiting response/i)).toBeInTheDocument();
  });

  it('can switch to add holder tab and display add holder form', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Click on the Actions tab instead as that's where the add holder form is
    await userEvent.click(screen.getByRole('tab', { name: /actions/i }));

    // Should show the add holder form in the Actions tab panel
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(within(tabPanel).getByText(/invite existing holder/i)).toBeInTheDocument();
      expect(within(tabPanel).getByText(/register new holder/i)).toBeInTheDocument();
    });

    // Should show both holder and batch upload buttons within the tab panel
    expect(within(tabPanel).getByRole('button', { name: /register holder/i })).toBeInTheDocument();
    expect(within(tabPanel).getByRole('button', { name: /batch upload/i })).toBeInTheDocument();
  });

  it('can open the register holder modal and validate form', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Click the register holder button
    await userEvent.click(screen.getByRole('button', { name: /register holder/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/register new holder/i)).toBeInTheDocument();
    });

    // Find form inputs within the modal to avoid ambiguity
    const modal = screen.getByRole('dialog');
    const emailInput = within(modal).getByLabelText(/email/i);
    const usernameInput = within(modal).getByLabelText(/username/i);
    const passwordInput = within(modal).getByLabelText(/password/i);

    // Fill in invalid email (missing @ symbol)
    await userEvent.type(emailInput, 'invalidemail');
    await userEvent.type(usernameInput, 'us'); // too short
    await userEvent.type(passwordInput, 'short'); // too short

    // Try to submit
    await userEvent.click(within(modal).getByRole('button', { name: /^register holder$/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('can open the batch upload modal', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    // Click the batch upload button
    await userEvent.click(screen.getByRole('button', { name: /batch upload/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/batch register holders/i)).toBeInTheDocument();
      expect(within(modal).getByText(/feature coming soon/i)).toBeInTheDocument();
    });
  });

  it('allows inviting a holder via email', async () => {
    renderWithProviders(issuerUser, [sampleIssuer]);

    await userEvent.click(screen.getByRole('tab', { name: /actions/i }));

    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
    const actionsTabPanel = screen.getByRole('tabpanel');

    const emailInput = within(actionsTabPanel).getByPlaceholderText(
      /enter holder's email address/i,
    );
    const inviteButton = within(actionsTabPanel).getByRole('button', { name: /^invite holder$/i });

    // Enter valid email
    await userEvent.type(emailInput, 'new.holder@example.com');

    // Click invite
    await userEvent.click(inviteButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/invitation sent to new.holder@example.com/i)).toBeInTheDocument();
    });
  });
});
