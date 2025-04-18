import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import IssueDegree from '@/pages/degree/IssueDegree';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

// Mock API responses for the universities
vi.mock('@/api/universities/university.queries', () => ({
  useMyUniversitiesQuery: () => ({
    data: [
      {
        id: 'uni1',
        displayName: 'Test University',
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
vi.mock('@/api/degrees/degree.mutations', () => ({
  useIssueDegreeeMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ docId: 'mock-doc-123' }),
    isPending: false,
    error: null,
  }),
}));

import ProtectedRoute from '@/components/ProtectedRoute';

function renderWithProviders(user: any) {
  const queryClient = new QueryClient();
  return render(
    <MemoryRouter initialEntries={['/degree/issue']}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ModalsProvider>
            <MockAuthProvider user={user}>
              <Routes>
                <Route
                  path="/degree/issue"
                  element={
                    <ProtectedRoute
                      requiredRole="university"
                      deniedMessage="Only universities can issue degrees."
                    >
                      <IssueDegree />
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
const universityUser = {
  id: 'u1',
  email: 'uni@example.com',
  role: 'university',
  username: 'universityUser',
};
const individualUser = {
  id: 'i1',
  email: 'ind@example.com',
  role: 'individual',
  username: 'individualUser',
};
const employerUser = {
  id: 'e1',
  email: 'emp@example.com',
  role: 'employer',
  username: 'employerUser',
};

// Create mock file for tests
function createMockFile(name = 'test.pdf', size = 1024, type = 'application/pdf') {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('IssueDegree Component', () => {
  it('shows access denied for individual users', () => {
    renderWithProviders(individualUser);
    expect(screen.getByText(/only universities can issue degrees/i)).toBeInTheDocument();
  });

  it('shows access denied for employer users', () => {
    renderWithProviders(employerUser);
    expect(screen.getByText(/only universities can issue degrees/i)).toBeInTheDocument();
  });

  it('displays the stepper and first step for university users', async () => {
    renderWithProviders(universityUser);

    // The page title should be visible
    expect(screen.getByText('Issue New Degree')).toBeInTheDocument();

    // First step should be active and show university selection
    expect(screen.getByText('Student & University')).toBeInTheDocument();
    expect(screen.getByText('Issuing University')).toBeInTheDocument();
    expect(screen.getByText('Student Email')).toBeInTheDocument();

    // Check for the Next Step button
    expect(screen.getByText('Next Step')).toBeInTheDocument();
  });

  it('navigates through steps when filling out the form', async () => {
    renderWithProviders(universityUser);
    const user = userEvent.setup();

    // Step 1: Student & University
    await user.click(screen.getByPlaceholderText(/select a university/i));
    await user.click(screen.getByText('Test University'));
    await user.type(screen.getByLabelText(/student email/i), 'student@example.com');
    await user.click(screen.getByText('Next Step'));

    // Step 2: Degree Details should now be visible
    await waitFor(() => {
      expect(screen.getByText('Degree Title')).toBeInTheDocument();
    });

    // Fill out Step 2
    await user.type(screen.getByLabelText(/degree title/i), 'Bachelor of Science');
    await user.type(screen.getByLabelText(/field of study/i), 'Computer Science');
    await user.type(screen.getByLabelText(/graduation date/i), '2025-05-20');
    await user.type(screen.getByLabelText(/student id/i), '12345678');
    await user.type(screen.getByLabelText(/program duration/i), '4 years');
    await user.type(screen.getByLabelText(/gpa/i), '3.85');

    // Move to Step 3
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Document Upload should now be visible
    await waitFor(() => {
      expect(screen.getByText('Upload Degree Document')).toBeInTheDocument();
    });
  });

  it('shows validation error on final step if file is missing', async () => {
    renderWithProviders(universityUser);
    const user = userEvent.setup();

    // Step 1: Fill out first step
    await user.click(screen.getByPlaceholderText(/select a university/i));
    await user.click(screen.getByText('Test University'));
    await user.type(screen.getByLabelText(/student email/i), 'student@example.com');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 2: Fill out second step
    await waitFor(() => expect(screen.getByLabelText(/degree title/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/degree title/i), 'Bachelor of Science');
    await user.type(screen.getByLabelText(/field of study/i), 'Computer Science');
    await user.type(screen.getByLabelText(/graduation date/i), '2025-05-20');
    await user.type(screen.getByLabelText(/student id/i), '12345678');
    await user.type(screen.getByLabelText(/program duration/i), '4 years');
    await user.type(screen.getByLabelText(/gpa/i), '3.85');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Document Upload page should be visible
    await waitFor(() => expect(screen.getByText('Upload Degree Document')).toBeInTheDocument());

    // Check that the "Issue Degree" button exists and is disabled because no file is uploaded
    const issueButton = screen.getByRole('button', { name: /issue degree/i });
    expect(issueButton).toBeInTheDocument();
    expect(issueButton).toBeDisabled();
  });

  // Test for the file upload functionality
  it('handles file upload correctly', async () => {
    // Global.File mock for testing environment
    global.URL.createObjectURL = vi.fn(() => 'mock-url');

    renderWithProviders(universityUser);
    const user = userEvent.setup();

    // Step 1: Fill out first step
    await user.click(screen.getByPlaceholderText(/select a university/i));
    await user.click(screen.getByText('Test University'));
    await user.type(screen.getByLabelText(/student email/i), 'student@example.com');
    await user.click(screen.getByText('Next Step'));

    // Step 2: Fill out second step
    await waitFor(() => expect(screen.getByLabelText(/degree title/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/degree title/i), 'Bachelor of Science');
    await user.type(screen.getByLabelText(/field of study/i), 'Computer Science');
    await user.type(screen.getByLabelText(/graduation date/i), '2025-05-20');
    await user.type(screen.getByLabelText(/student id/i), '12345678');
    await user.type(screen.getByLabelText(/program duration/i), '4 years');
    await user.type(screen.getByLabelText(/gpa/i), '3.85');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Step 3: Upload page should be visible
    await waitFor(() => expect(screen.getByText('Upload Degree Document')).toBeInTheDocument());

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
  });
});
