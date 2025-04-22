import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import IssueCredential from '@/pages/credential/IssueCredential';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

// Mock API responses for the issuers
vi.mock('@/api/issuers/issuer.queries', () => ({
  useMyIssuersQuery: () => ({
    data: [
      {
        id: 'uni1',
        shorthand: 'Test Issuer', // Add shorthand field which is used in Select
        displayName: 'Test University Issuer',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock file upload utility
vi.mock('@/utils/fileUtils', () => ({
  fileToBase64: async () => 'base64-mock-data',
}));

// Mock mutations
vi.mock('@/api/credentials/credential.mutations', () => ({
  useIssueCredentialMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ docId: 'mock-doc-123' }),
    isPending: false,
    error: null,
  }),
}));

import ProtectedRoute from '@/components/ProtectedRoute';

function renderWithProviders(user: any) {
  const queryClient = new QueryClient();
  return render(
    <MemoryRouter initialEntries={['/credential/issue']}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ModalsProvider>
            <MockAuthProvider user={user}>
              <Routes>
                <Route
                  path="/credential/issue"
                  element={
                    <ProtectedRoute
                      requiredRole="issuer"
                      deniedMessage="Only issuers can issue credentials."
                    >
                      <IssueCredential />
                    </ProtectedRoute>
                  }
                />
                <Route path="/dashboard" element={<div>Dashboard page</div>} />
              </Routes>
            </MockAuthProvider>
          </ModalsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

// Mock users for testing
const issuerUser = {
  id: 'u1',
  email: 'uni@example.com',
  role: 'issuer',
  username: 'issuerUser',
};
const holderUser = {
  id: 'i1',
  email: 'ind@example.com',
  role: 'holder',
  username: 'holderUser',
};
const verifierUser = {
  id: 'e1',
  email: 'emp@example.com',
  role: 'verifier',
  username: 'verifierUser',
};

// Create mock file for tests
function createMockFile(name = 'test.pdf', size = 1024, type = 'application/pdf') {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('IssueCredential Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  it('shows access denied for holder users', () => {
    renderWithProviders(holderUser);
    expect(screen.getByText(/only issuers can issue credentials/i)).toBeInTheDocument();
  });

  it('shows access denied for verifier users', () => {
    renderWithProviders(verifierUser);
    expect(screen.getByText(/only issuers can issue credentials/i)).toBeInTheDocument();
  });

  it('displays the stepper and first step for issuer users', async () => {
    renderWithProviders(issuerUser);

    // The page title should be visible
    expect(screen.getByText('Issue New Credential')).toBeInTheDocument();

    // First step should be active and show issuer selection
    expect(screen.getByText('Holder & Issuer')).toBeInTheDocument();
    expect(screen.getByText('Issuing Organization')).toBeInTheDocument();
    expect(screen.getByText('Holder Email')).toBeInTheDocument();

    // Check for the Next Step button
    expect(screen.getByRole('button', { name: /next step/i })).toBeInTheDocument();
  });

  it('navigates through steps when filling out the form', async () => {
    renderWithProviders(issuerUser);
    const user = userEvent.setup();

    // Step 1: Holder & Issuer
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await user.click(issuerSelect);
    await user.click(screen.getByText('Test Issuer'));
    await user.type(screen.getByLabelText(/holder email/i), 'holder@example.com');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 2: Credential Details should now be visible
    await waitFor(() => {
      expect(screen.getByText('Required Information')).toBeInTheDocument();
    });

    // Fill out Step 2
    await user.type(screen.getByLabelText(/credential title/i), 'Test Credential');
    await user.type(screen.getByLabelText(/credential type/i), 'Certificate');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');

    // Move to Step 3
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Document Upload should now be visible
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });
  });

  it('shows validation error on final step if file is missing', async () => {
    renderWithProviders(issuerUser);
    const user = userEvent.setup();

    // Step 1: Fill out first step
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await user.click(issuerSelect);
    await user.click(screen.getByText('Test Issuer'));
    await user.type(screen.getByLabelText(/holder email/i), 'holder@example.com');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 2: Fill out second step
    await waitFor(() => expect(screen.getByLabelText(/credential title/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/credential title/i), 'Test Credential');
    await user.type(screen.getByLabelText(/credential type/i), 'Certificate');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Document Upload page should be visible
    await waitFor(() => expect(screen.getByText('Upload Credential Document')).toBeInTheDocument());

    // Try to submit without a file
    const submitButton = screen.getByRole('button', { name: /issue credential/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles file upload correctly', async () => {
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    renderWithProviders(issuerUser);
    const user = userEvent.setup();

    // Step 1: Fill out first step
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await user.click(issuerSelect);
    await user.click(screen.getByText('Test Issuer'));
    await user.type(screen.getByLabelText(/holder email/i), 'holder@example.com');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 2: Fill out second step
    await waitFor(() => expect(screen.getByLabelText(/credential title/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/credential title/i), 'Test Credential');
    await user.type(screen.getByLabelText(/credential type/i), 'Certificate');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Upload page should be visible
    await waitFor(() => expect(screen.getByText('Upload Credential Document')).toBeInTheDocument());

    // Mock a file upload
    const mockFile = createMockFile();
    const fileInput = screen.getByTestId('file-input-hidden');

    // Simulate file selection
    await user.upload(fileInput, mockFile);

    // File should be uploaded and showing
    await waitFor(() => {
      expect(screen.getByText('File Selected')).toBeInTheDocument();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Submit button should be enabled
    const submitButton = screen.getByRole('button', { name: /issue credential/i });
    expect(submitButton).toBeEnabled();
  });
});
