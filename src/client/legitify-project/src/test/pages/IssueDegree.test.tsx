import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import IssueDegree from '@/pages/degree/IssueDegree';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { act } from 'react';
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

import ProtectedRoute from '@/components/ProtectedRoute';

function renderWithProviders(user: any) {
  const queryClient = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ModalsProvider>
            <MockAuthProvider user={user}>
              <ProtectedRoute
                requiredRole="university"
                deniedMessage="Only universities can issue degrees."
              >
                <IssueDegree />
              </ProtectedRoute>
            </MockAuthProvider>
          </ModalsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

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

describe('IssueDegree (authenticated UI)', () => {
  it('shows validation error when Degree Title is missing', async () => {
    renderWithProviders(universityUser);
    await userEvent.type(screen.getByLabelText(/student email/i), 'student@example.com');
    await userEvent.type(screen.getByLabelText(/degree title/i), 'Bachelor of Science');
    await userEvent.type(screen.getByLabelText(/field of study/i), 'Computer Science');
    await userEvent.type(screen.getByLabelText(/graduation date/i), '2024-05-31');
    await userEvent.type(screen.getByLabelText(/student id/i), '12345678');
    await userEvent.type(screen.getByLabelText(/program duration/i), '4');
    await userEvent.type(screen.getByLabelText(/gpa/i), '3.85');
    // Robustly select university using the input and option text
    const selectInput = screen.getByPlaceholderText(/select a university/i);
    await userEvent.click(selectInput); // open dropdown
    const option = await screen.findByText(/Test University/i, {}, { timeout: 2000 });
    await userEvent.click(option); // select the university
    // Do NOT upload a file, to trigger the local error
    const submitButton = screen.getByRole('button', { name: /issue degree/i });

    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows degree issuance form for university users', () => {
    renderWithProviders(universityUser);
    expect(screen.getByLabelText(/student email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/degree title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/field of study/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /issue degree/i })).toBeInTheDocument();
  });

  it('shows info/warning for individual users', () => {
    renderWithProviders(individualUser);
    expect(screen.getByText(/only universities can issue degrees/i)).toBeInTheDocument();
  });

  it('shows info/warning for employer users', () => {
    renderWithProviders(employerUser);
    expect(screen.getByText(/only universities can issue degrees/i)).toBeInTheDocument();
  });
});
