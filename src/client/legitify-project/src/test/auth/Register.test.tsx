import { ModalsProvider } from '@/contexts/ModalsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Register from '@/pages/auth/Register'; // Adjust the path as needed
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock the modules we need
vi.mock('axios');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
vi.mock('@/api/auth/auth.api', () => ({
  register: vi.fn(),
}));

// Mock functions
const mockNavigate = vi.fn();
const mockLogin = vi.fn();

// --- Mock Auth Context ---
const AuthContext = React.createContext<any>(null);
function MockAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        isLoading: false,
        login: mockLogin,
        logout: vi.fn(),
        refreshUser: vi.fn(),
        refreshSession: vi.fn(),
        api: {
          get: vi.fn(),
          post: vi.fn(),
        },
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
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => React.useContext(AuthContext),
  };
});

// Mock environment variables
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
  
  // Mock import.meta.env.VITE_API_URL
  vi.stubGlobal('import', {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000/api',
      },
    },
  });
});

function renderWithProviders() {
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
            <MockAuthProvider>
              <Register />
            </MockAuthProvider>
          </ModalsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Register Component', () => {
  it('renders registration form with step 1 initially', () => {
    renderWithProviders();
    
    // Check for step 1 elements
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByText(/individual/i)).toBeInTheDocument();
    expect(screen.getByText(/employer/i)).toBeInTheDocument();
    expect(screen.getByText(/university/i)).toBeInTheDocument();
    
    // Check that step 2 elements are not visible yet
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/i accept the terms and conditions/i)).not.toBeInTheDocument();
  });

  it('validates required fields in step 1', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Try to go to next step without filling required fields
    const nextButton = screen.getByText(/next/i);
    await user.click(nextButton);
    
    // Form should still be on step 1
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
  });

  it('moves to step 2 when step 1 is valid', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill in required fields for step 1
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should now be on step 2
    await waitFor(() => {
      expect(screen.getByText(/country/i)).toBeInTheDocument();
      expect(screen.getByText(/i accept the terms and conditions/i)).toBeInTheDocument();
    });
  });

  it('displays error for password mismatch', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill in fields with mismatched passwords
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    
    // Try to go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should still be on step 1 with error
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('fetches universities when individual role selected in step 2', async () => {
    // Mock axios.get to return universities
    vi.mocked(axios.get).mockResolvedValueOnce({ 
      data: [
        { id: 'uni1', name: 'University 1', displayName: 'University One' },
        { id: 'uni2', name: 'University 2', displayName: 'University Two' }
      ] 
    });
    
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Select individual role
    await user.click(screen.getByText(/individual/i));
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Verify that axios.get was called with correct URL
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/university/all');
    });
  });

  it('shows university-specific fields when university role is selected', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Select university role
    await user.click(screen.getByText(/university/i));
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should show university-specific fields
    await waitFor(() => {
      expect(screen.getByText(/i'll provide university information later/i)).toBeInTheDocument();
      // When "provide later" is not checked, university name fields should appear
      expect(screen.getByLabelText(/university name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });
  });

  it('hides university fields when "provide later" is checked', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Select university role
    await user.click(screen.getByText(/university/i));
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Check "provide later" switch
    await user.click(screen.getByLabelText(/i'll provide university information later/i));
    
    // University name fields should be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText(/university name/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });
  });

  it('shows organization fields when employer role is selected', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Select employer role
    await user.click(screen.getByText(/employer/i));
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should show employer-specific fields
    await waitFor(() => {
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    });
  });

  it('submits registration form successfully', async () => {
    // Mock the register function to resolve successfully
    const { register } = await import('@/api/auth/auth.api');
    vi.mocked(register).mockResolvedValueOnce({});
    
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Fill step 2 fields
    await waitFor(() => {
      const countrySelect = screen.getByLabelText(/country/i);
      return user.click(countrySelect);
    });
    
    // Select a country
    await user.click(screen.getByText(/united states/i));
    
    // Accept terms
    await user.click(screen.getByLabelText(/i accept the terms and conditions/i));
    
    // Submit the form
    await act(async () => {
      await user.click(screen.getByText(/register/i));
    });
    
    // Verify that register was called with correct data
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: 'individual',
      });
      // Verify that login was called with correct credentials
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      // Verify navigation to dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles registration error', async () => {
    // Mock the register function to reject with error
    const { register } = await import('@/api/auth/auth.api');
    vi.mocked(register).mockRejectedValueOnce({ message: 'Email already exists' });
    
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Fill step 2 fields
    await waitFor(() => {
      const countrySelect = screen.getByLabelText(/country/i);
      return user.click(countrySelect);
    });
    
    // Select a country
    await user.click(screen.getByText(/united states/i));
    
    // Accept terms
    await user.click(screen.getByLabelText(/i accept the terms and conditions/i));
    
    // Submit the form
    await act(async () => {
      await user.click(screen.getByText(/register/i));
    });
    
    // Verify that error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('navigates back to step 1 when back button is clicked', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill step 1 fields
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should now be on step 2
    await waitFor(() => {
      expect(screen.getByText(/country/i)).toBeInTheDocument();
    });
    
    // Click back button
    await user.click(screen.getByText(/back/i));
    
    // Should be back on step 1
    await waitFor(() => {
      expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });

  it('validates email format correctly', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill in fields with invalid email
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Try to go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should still be on step 1 with error
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
  });

  it('validates username length correctly', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill in fields with short username
    await user.type(screen.getByLabelText(/username/i), 'ab');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Try to go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should still be on step 1 with error
    expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
  });

  it('validates password length correctly', async () => {
    renderWithProviders();
    const user = userEvent.setup();
    
    // Fill in fields with short password
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'pass');
    await user.type(screen.getByLabelText(/confirm password/i), 'pass');
    
    // Try to go to next step
    await user.click(screen.getByText(/next/i));
    
    // Should still be on step 1 with error
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
  });
});