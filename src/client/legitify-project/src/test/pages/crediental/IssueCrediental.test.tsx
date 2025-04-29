import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import IssueCredential from '../../../pages/credential/IssueCredential';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fileToBase64 } from '@/utils/fileUtils';
import axios from 'axios';
import { MantineProvider } from '@mantine/core';
import React from 'react';

// Set up mocks
const mockMyIssuersQuery = vi.fn();
const mockIssueCredentialMutation = vi.fn();

// Mock the modules that are imported by the component
vi.mock('@/api/credentials/credential.mutations', () => ({
  useIssueCredentialMutation: () => mockIssueCredentialMutation(),
}));

vi.mock('../../api/issuers/issuer.queries', () => ({
  useMyIssuersQuery: () => mockMyIssuersQuery(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
}));

vi.mock('@/utils/fileUtils', () => ({
  fileToBase64: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: vi.fn().mockImplementation(({ children, to }) => <a href={to}>{children}</a>),
  };
});

// Mock Mantine notifications
const mockNotifications = {
  show: vi.fn(),
};
vi.stubGlobal('notifications', mockNotifications);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('IssueCredential Component', () => {
  // Mock data
  const mockIssuers = [
    { id: 'issuer1', shorthand: 'University A' },
    { id: 'issuer2', shorthand: 'Corporation B' },
  ];

  // Create a mock axios instance for the auth context
  const mockAxiosInstance = axios.create();
  
  // Fixed: Using the correct TwoFactorState property names
  const mockTwoFactorState = {
    required: false, // Changed from isRequired to required
    isVerifying: false,
    verificationSent: false,
    error: null
  };
  
  // More complete mock objects with required properties
  const mockAuthContextValues = {
    refreshSession: vi.fn().mockResolvedValue(undefined),
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    isAuthenticated: false,
    authError: null,
    clearAuthError: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    refreshUser: vi.fn(),
    api: mockAxiosInstance,
    twoFactorState: mockTwoFactorState,
    verifyTwoFactor: vi.fn(),
    clearTwoFactorState: vi.fn(),
  };

  const mockThemeContextValues = {
    isDarkMode: false,
    toggleTheme: vi.fn(),
    setLightTheme: vi.fn(),
    setDarkTheme: vi.fn(),
  };

  const mockMutateAsync = vi.fn();
  const mockIssueMutation = {
    mutateAsync: mockMutateAsync,
    isPending: false,
    error: null,
    isError: false,
  };

  // Create a wrapper component that includes all providers
  const AllProviders: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <MantineProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </MantineProvider>
  );

  // Custom render function that includes providers
  const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => 
    render(ui, { wrapper: AllProviders, ...options });

  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the hooks
    vi.mocked(useAuth).mockReturnValue(mockAuthContextValues);
    vi.mocked(useTheme).mockReturnValue(mockThemeContextValues);
    
    // Setup query and mutation mocks
    mockMyIssuersQuery.mockReturnValue({
      data: mockIssuers,
      isLoading: false,
      error: null,
    });
    
    mockIssueCredentialMutation.mockReturnValue(mockIssueMutation);
    vi.mocked(fileToBase64).mockResolvedValue('base64content');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the component with initial step', async () => {
    customRender(<IssueCredential />, {});

    // Check if the initial step (Holder & Issuer) is visible
    expect(screen.getByText('Issue New Credential')).toBeInTheDocument();
    expect(screen.getByText('Holder & Issuer')).toBeInTheDocument();
    expect(screen.getByText('Identify the parties')).toBeInTheDocument();
    expect(screen.getByLabelText('Issuing Organization Select')).toBeInTheDocument();
  });

  it('loads issuers from the API and populates the select', async () => {
    customRender(<IssueCredential />, {});

    // Open the select dropdown
    const selectBox = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(selectBox);

    // Check if all issuers are in the document
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
      expect(screen.getByText('Corporation B')).toBeInTheDocument();
    });
  });

  it('displays loading state when issuers are loading', async () => {
    mockMyIssuersQuery.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    customRender(<IssueCredential />, {});

    expect(screen.getByText('Loading issuers...')).toBeInTheDocument();
  });

  it('allows navigation to the next step when required fields are filled in step 1', async () => {
    customRender(<IssueCredential />, {});

    // Fill in required fields in step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');

    // Click next step button
    const nextButton = screen.getByText('Next Step');
    await userEvent.click(nextButton);

    // Verify we moved to step 2
    await waitFor(() => {
      expect(screen.getByText('Required Information')).toBeInTheDocument();
      expect(screen.getByText('Credential Title')).toBeInTheDocument();
      expect(screen.getByText('Credential Type')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  it('prevents navigation to the next step when required fields are missing in step 1', async () => {
    customRender(<IssueCredential />, {});

    // Try to click next without filling required fields
    const nextButton = screen.getByText('Next Step');
    await userEvent.click(nextButton);

    // We should still be on step 1
    expect(screen.getByLabelText('Issuing Organization Select')).toBeInTheDocument();
    expect(screen.getByLabelText('Holder Email')).toBeInTheDocument();
    
    // Mantine notifications.show should have been called
    expect(mockNotifications.show).toHaveBeenCalled();
  });

  it('completes step 2 and moves to step 3 when required fields are filled', async () => {
    customRender(<IssueCredential />, {});

    // Fill in required fields in step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');

    // Click next step
});})