import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ManageUniversities from '@/pages/university/ManageUniversities';
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

// Create mock functions for react-query hooks
const mockUseMyUniversitiesQuery = vi.fn();
const mockUseAllUniversitiesQuery = vi.fn();
const mockUsePendingAffiliationsQuery = vi.fn();
const mockUseRecentIssuedDegreesQuery = vi.fn();

// --- Mock University API Queries ---
vi.mock('@/api/universities/university.queries', () => ({
  useMyUniversitiesQuery: (...args: any[]) => mockUseMyUniversitiesQuery(...args),
  useAllUniversitiesQuery: (...args: any[]) => mockUseAllUniversitiesQuery(...args),
  usePendingAffiliationsQuery: (...args: any[]) => mockUsePendingAffiliationsQuery(...args),
}));

// --- Mock University API Mutations ---
vi.mock('@/api/universities/university.mutations', () => ({
  useCreateUniversityMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      university: {
        id: 'new-uni-1',
        displayName: 'New Test University',
        name: 'new-test-university',
        description: 'Test description',
        affiliations: [],
      },
    }),
    isPending: false,
  }),
  useJoinUniversityMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useAddStudentMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
  useRegisterStudentMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      success: true,
      username: 'newstudent',
    }),
    isPending: false,
  }),
  useRespondToAffiliationMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  }),
}));

// --- Mock Degree API Queries ---
vi.mock('@/api/degrees/degree.queries', () => ({
  useRecentIssuedDegreesQuery: (...args: any[]) => mockUseRecentIssuedDegreesQuery(...args),
}));

// Custom render function with providers
function renderWithProviders(user: any = null, universityData: any[] = []) {
  // Setup mocks for this render
  mockUseMyUniversitiesQuery.mockReturnValue({
    data: universityData,
    isLoading: false,
    error: null,
  });

  mockUseAllUniversitiesQuery.mockReturnValue({
    data: [
      { id: 'uni-1', displayName: 'Test University' },
      { id: 'uni-2', displayName: 'Another University' },
    ],
    isLoading: false,
  });

  mockUsePendingAffiliationsQuery.mockReturnValue({
    data: [
      {
        id: 'aff-1',
        status: 'pending',
        initiatedBy: 'student',
        createdAt: '2025-01-01T00:00:00Z',
        user: { username: 'student1', email: 'student1@example.com' },
      },
      {
        id: 'aff-2',
        status: 'pending',
        initiatedBy: 'university',
        createdAt: '2025-01-01T00:00:00Z',
        user: { username: 'student2', email: 'student2@example.com' },
      },
    ],
    isLoading: false,
  });

  mockUseRecentIssuedDegreesQuery.mockReturnValue({
    data: [
      {
        docId: 'degree-1',
        recipientName: 'Student A',
        issuedTo: 'student.a@example.com',
        status: 'accepted',
        issueDate: '2025-03-15T10:00:00Z',
      },
      {
        docId: 'degree-2',
        recipientName: 'Student B',
        issuedTo: 'student.b@example.com',
        status: 'pending',
        issueDate: '2025-03-10T10:00:00Z',
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
              <ManageUniversities />
            </MockAuthProvider>
          </ModalsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ManageUniversities component', () => {
  // Sample user for testing
  const universityUser = {
    id: 'u1',
    email: 'uni@example.com',
    role: 'university',
    username: 'universityUser',
  };

  // Sample university data
  const sampleUniversity = {
    id: 'uni-1',
    name: 'test-university',
    displayName: 'Test University',
    description: 'Test university description',
    affiliations: [
      {
        id: 'aff-active-1',
        status: 'active',
        user: { username: 'activeStudent', email: 'active@student.com' },
      },
    ],
  };

  it('shows create/join options when user has no university', async () => {
    renderWithProviders(universityUser);

    // Should show the alert about not having a university
    expect(screen.getByText(/you don't have a university yet/i)).toBeInTheDocument();

    // Should show create and join buttons
    expect(screen.getByRole('button', { name: /create university/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join existing university/i })).toBeInTheDocument();
  });

  it('opens and validates the create university modal', async () => {
    renderWithProviders(universityUser);

    // Click the create university button
    await userEvent.click(screen.getByRole('button', { name: /create university/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(
        within(modal).getByRole('heading', { name: /create university/i }),
      ).toBeInTheDocument();
    });

    // Click create without filling required fields
    const modal = screen.getByRole('dialog');
    await userEvent.click(within(modal).getByRole('button', { name: /^create university$/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/identifier is required/i)).toBeInTheDocument();
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });
  });

  it('opens and validates the join university modal', async () => {
    renderWithProviders(universityUser);

    // Click the join university button
    await userEvent.click(screen.getByRole('button', { name: /join existing university/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/select university/i)).toBeInTheDocument();
    });

    // Click join without selecting a university
    const modal = screen.getByRole('dialog');
    await userEvent.click(within(modal).getByRole('button', { name: /^send request$/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/please select a university/i)).toBeInTheDocument();
    });
  });

  it('displays university dashboard when user has a university', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Should show the university name in the title
    expect(screen.getByText(/manage university: test university/i)).toBeInTheDocument();

    // Should show dashboard info
    await waitFor(() => {
      expect(screen.getByText(/university dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    // Should show tabs
    expect(screen.getByRole('tab', { name: /students/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /join requests/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sent invitations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /add student/i })).toBeInTheDocument();
  });

  it('displays active students in the students tab', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Students tab should be active by default
    expect(screen.getByText(/affiliated students/i)).toBeInTheDocument();

    // Should show the student in the table - more precisely target the table cells
    const table = screen.getAllByRole('table')[1]; // The affiliated students table
    const tableBody = within(table).getAllByRole('rowgroup')[1]; // Get the tbody
    const studentRow = within(tableBody).getByRole('row');

    // Check specific cells for student info
    const cells = within(studentRow).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('activeStudent');
    expect(cells[1]).toHaveTextContent('active@student.com');
  });

  it('can switch to join requests tab and display pending requests', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Click on the join requests tab
    await userEvent.click(screen.getByRole('tab', { name: /join requests/i }));

    // Should show the pending requests content
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(
        within(tabPanel).getByText(/these students have requested to join your university/i),
      ).toBeInTheDocument();
    });

    // Find specific table cell for student name to avoid ambiguity
    const table = within(tabPanel).getByRole('table');
    const rows = within(table).getAllByRole('row');
    // Skip header row (index 0)
    const studentCell = within(rows[1]).getAllByRole('cell')[0]; // First cell should be the username
    expect(studentCell).toHaveTextContent('student1');

    // Should show approve/reject buttons
    expect(within(tabPanel).getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(within(tabPanel).getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('can switch to sent invitations tab and display pending invitations', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Click on the sent invitations tab
    await userEvent.click(screen.getByRole('tab', { name: /sent invitations/i }));

    // Should show the pending invitations content
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(within(tabPanel).getByText(/you've invited these students/i)).toBeInTheDocument();
    });

    // Find specific table cell for student name to avoid ambiguity
    const table = within(tabPanel).getByRole('table');
    const rows = within(table).getAllByRole('row');
    // Skip header row (index 0)
    const studentCell = within(rows[1]).getAllByRole('cell')[0]; // First cell should be the username
    expect(studentCell).toHaveTextContent('student2');

    // Should show pending status
    expect(within(tabPanel).getByText(/awaiting response/i)).toBeInTheDocument();
  });

  it('can switch to add student tab and display add student form', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Click on the add student tab
    await userEvent.click(screen.getByRole('tab', { name: /add student/i }));

    // Should show the add student form in the specific tab panel
    const tabPanel = screen.getByRole('tabpanel');
    await waitFor(() => {
      expect(within(tabPanel).getByText(/register new students/i)).toBeInTheDocument();
    });

    // Should show both individual and batch upload buttons within the tab panel
    expect(
      within(tabPanel).getByRole('button', { name: /register individual/i }),
    ).toBeInTheDocument();
    expect(within(tabPanel).getByRole('button', { name: /batch upload/i })).toBeInTheDocument();
  });

  it('can open the register student modal and validate form', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Click on the add student tab
    await userEvent.click(screen.getByRole('tab', { name: /add student/i }));

    // Click the register individual button
    await userEvent.click(screen.getByRole('button', { name: /register individual/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/register new student/i)).toBeInTheDocument();
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
    await userEvent.click(within(modal).getByRole('button', { name: /^register student$/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('can open the batch upload modal', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Click on the add student tab
    await userEvent.click(screen.getByRole('tab', { name: /add student/i }));

    // Click the batch upload button
    await userEvent.click(screen.getByRole('button', { name: /batch upload/i }));

    // Wait for the modal to be visible
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText(/batch register students/i)).toBeInTheDocument();
      expect(within(modal).getByText(/csv upload feature coming soon/i)).toBeInTheDocument();
    });
  });

  it('allows inviting a student via email', async () => {
    renderWithProviders(universityUser, [sampleUniversity]);

    // Get the students tab panel which should be active by default
    const studentsTab = screen.getByRole('tabpanel');

    // Find the email input by its label text
    const emailInput = within(studentsTab).getByLabelText(/student email/i);
    // Find invite button directly in the tab panel
    const inviteButton = within(studentsTab).getByRole('button', { name: /^invite student$/i });

    // Enter valid email
    await userEvent.type(emailInput, 'new.student@example.com');

    // Click invite
    await userEvent.click(inviteButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/invitation sent to new.student@example.com/i)).toBeInTheDocument();
    });
  });
});
