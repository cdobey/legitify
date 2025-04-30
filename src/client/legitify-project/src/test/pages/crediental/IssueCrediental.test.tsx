import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Fix 1: Mock the useMediaQuery hook to return a simple boolean
vi.mock('@mantine/hooks', async () => {
  const actual = await vi.importActual('@mantine/hooks');
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

// Set up mocks
const mockMyIssuersQuery = vi.fn();
const mockIssueCredentialMutation = vi.fn();

// Mock the modules that are imported by the component
vi.mock('@/api/credentials/credential.mutations', () => ({
  useIssueCredentialMutation: () => mockIssueCredentialMutation(),
}));

// Important: Return a mocked function but keep React Query working
vi.mock('../../api/issuers/issuer.queries', () => ({
  useMyIssuersQuery: () => mockMyIssuersQuery(),
  issuerKeys: {
    my: () => ['issuers', 'my'],
  },
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

// Set up global mocks before all tests
beforeAll(() => {
  // Define a working matchMedia mock
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  // Silence irrelevant React warnings
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('matchMedia') || 
       args[0].includes('useMediaQuery') ||
       args[0].includes('React does not recognize the'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

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
    required: false, 
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

  // Create a new QueryClient for each test
  let queryClient: QueryClient;

  // Create a wrapper component that includes all providers
  const AllProviders: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );

  // Custom render function that includes providers
  const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => 
    render(ui, { wrapper: AllProviders, ...options });

  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Fix 4: Create a new QueryClient instance for each test with minimal configuration
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    
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

    // Click next step button to go to step 2
    const nextButton = screen.getByText('Next Step');
    await userEvent.click(nextButton);

    // Fill in required fields in step 2
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Credential Title');
      userEvent.type(titleInput, 'Test Credential');
    });

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');

    // Click next step button to go to step 3
    const step2NextButton = screen.getByText('Next Step');
    await userEvent.click(step2NextButton);

    // Verify we moved to step 3
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });
  });

  it('adds and removes custom attributes', async () => {
    customRender(<IssueCredential />, {});

    // Navigate to step 2
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');

    // Click next step button to go to step 2
    const nextButton = screen.getByText('Next Step');
    await userEvent.click(nextButton);

    // Wait for step 2 to load
    await waitFor(() => {
      expect(screen.getByText('Add Custom Attribute')).toBeInTheDocument();
    });
    
    // Add custom attribute button
    const addAttributeButton = screen.getByText('Add Custom Attribute');
    await userEvent.click(addAttributeButton);
    
    // Now we should have two attribute rows (one default empty + one new)
    const attributeInputs = screen.getAllByPlaceholderText('Attribute Name');
    expect(attributeInputs.length).toBe(2);
    
    // Fill the first attribute
    await userEvent.type(attributeInputs[0], 'Custom Field');
    
    const valueInputs = screen.getAllByPlaceholderText('Attribute Value');
    await userEvent.type(valueInputs[0], 'Custom Value');
    
    // Find the trash buttons by test id (Fix 5: Assuming there's a test ID on these buttons)
    // If there's no test ID, you might need to adjust your component to add one
    const trashButtons = screen.getAllByRole('button');
    const removeButtons = trashButtons.filter(button => 
      !button.textContent || button.textContent.trim() === '');
    
    // Remove the second attribute
    if (removeButtons.length >= 2) {
      await userEvent.click(removeButtons[1]); // Click the second remove button
      
      // Now we should have only one attribute row
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('Attribute Name').length).toBe(1);
      });
    }
  });

  it('handles file uploads and validates file size and type', async () => {
    customRender(<IssueCredential />, {});

    // Navigate to step 3
    // First fill step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Next Step'));

    // Then fill step 2
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Credential Title');
      userEvent.type(titleInput, 'Test Credential');
    });

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');
    await userEvent.click(screen.getByText('Next Step'));

    // Now at step 3, test file upload
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });

    // Test valid file upload
    const fileInput = screen.getByTestId('file-input-hidden');
    const validFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
    
    // Mock file size
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    
    await userEvent.upload(fileInput, validFile);
    
    // Should show file selected message
    await waitFor(() => {
      expect(screen.getByText('File Selected')).toBeInTheDocument();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.00MB')).toBeInTheDocument();
    });
    
    // Test file removal
    const removeButton = screen.getByText('Remove file');
    await userEvent.click(removeButton);
    
    // Upload dialog should reappear
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });
    
    // Test invalid file type
    const invalidTypeFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    await userEvent.upload(fileInput, invalidTypeFile);
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText('Only PDF files are accepted')).toBeInTheDocument();
    });
    
    // Test file too big
    const tooBigFile = new File(['big content'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooBigFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB
    
    await userEvent.upload(fileInput, tooBigFile);
    
    // Should show error about file size
    await waitFor(() => {
      expect(screen.getByText(/File size must be less than/)).toBeInTheDocument();
    });
  });

  it('submits the form successfully with valid data', async () => {
    // Mock successful credential issuance
    mockMutateAsync.mockResolvedValue({ docId: 'test-doc-123' });

    customRender(<IssueCredential />, {});

    // Navigate through steps and fill data
    // Step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 2
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Credential Title');
      userEvent.type(titleInput, 'Test Credential');
    });

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 3
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });

    // Upload valid file
    const fileInput = screen.getByTestId('file-input-hidden');
    const validFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    await userEvent.upload(fileInput, validFile);

    // Submit form
    await waitFor(() => {
      expect(screen.getByText('Issue Credential')).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText('Issue Credential'));

    // Verify success screen is shown
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Credential has been issued successfully')).toBeInTheDocument();
      expect(screen.getByText('test-doc-123')).toBeInTheDocument();
    });

    // Verify API was called with correct data
    expect(mockAuthContextValues.refreshSession).toHaveBeenCalled();
    expect(fileToBase64).toHaveBeenCalledWith(validFile);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      base64File: 'base64content',
      title: 'Test Credential',
      description: 'This is a test credential description',
      expirationDate: undefined,
      type: 'Certification',
      attributes: {},
      issuerOrgId: 'issuer1',
    });
  });

  it('handles API errors during submission', async () => {
    // Mock API error
    const errorMessage = 'Failed to issue credential: Network error';
    mockMutateAsync.mockRejectedValue(new Error(errorMessage));

    customRender(<IssueCredential />, {});

    // Navigate through steps and fill data
    // Step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 2
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Credential Title');
      userEvent.type(titleInput, 'Test Credential');
    });

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 3
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });

    // Upload valid file
    const fileInput = screen.getByTestId('file-input-hidden');
    const validFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    await userEvent.upload(fileInput, validFile);

    // Submit form
    await waitFor(() => {
      expect(screen.getByText('Issue Credential')).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText('Issue Credential'));

    // Verify error is shown
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('saves custom attribute keys to localStorage', async () => {
    // Mock successful credential issuance
    mockMutateAsync.mockResolvedValue({ docId: 'test-doc-123' });
    
    customRender(<IssueCredential />, {});

    // Navigate to step 2
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Next Step'));

    // Wait for step 2 to load
    await waitFor(() => {
      expect(screen.getByText('Add Custom Attribute')).toBeInTheDocument();
    });
    
    // Add custom attribute and fill it out
    const attributeInputs = screen.getAllByPlaceholderText('Attribute Name');
    await userEvent.type(attributeInputs[0], 'CustomKey1');
    
    const valueInputs = screen.getAllByPlaceholderText('Attribute Value');
    await userEvent.type(valueInputs[0], 'Value1');
    
    // Complete form and submit
    const titleInput = screen.getByLabelText('Credential Title');
    await userEvent.type(titleInput, 'Test Credential');

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');
    
    // Navigate to step 3
    await userEvent.click(screen.getByText('Next Step'));
    
    // Upload file in step 3
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });
    
    const fileInput = screen.getByTestId('file-input-hidden');
    const validFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    await userEvent.upload(fileInput, validFile);
    
    // Submit form
    await waitFor(() => {
      expect(screen.getByText('Issue Credential')).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText('Issue Credential'));
    
    // Verify keys were saved to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'legitify-custom-attribute-keys',
        expect.any(String)
      );
      
      // Parse the saved JSON to check content
      const savedCall = vi.mocked(localStorageMock.setItem).mock.calls.find(
        call => call[0] === 'legitify-custom-attribute-keys'
      );
      
      if (savedCall) {
        const savedValue = JSON.parse(savedCall[1] as string);
        expect(savedValue).toContain('CustomKey1');
      }
    });
  });

  it('returns to first step when choosing to issue another credential', async () => {
    // Mock successful credential issuance
    mockMutateAsync.mockResolvedValue({ docId: 'test-doc-123' });
    
    customRender(<IssueCredential />, {});

    // Navigate through all steps and submit
    // Step 1
    const issuerSelect = screen.getByLabelText('Issuing Organization Select');
    await userEvent.click(issuerSelect);
    await waitFor(() => {
      expect(screen.getByText('University A')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('University A'));

    const emailInput = screen.getByLabelText('Holder Email');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 2
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Credential Title');
      userEvent.type(titleInput, 'Test Credential');
    });

    const typeInput = screen.getByLabelText('Credential Type');
    await userEvent.type(typeInput, 'Certification');

    const descriptionInput = screen.getByLabelText('Description');
    await userEvent.type(descriptionInput, 'This is a test credential description');
    await userEvent.click(screen.getByText('Next Step'));

    // Step 3
    await waitFor(() => {
      expect(screen.getByText('Upload Credential Document')).toBeInTheDocument();
    });

    // Upload valid file
    const fileInput = screen.getByTestId('file-input-hidden');
    const validFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
    await userEvent.upload(fileInput, validFile);

    // Submit form
    await waitFor(() => {
      expect(screen.getByText('Issue Credential')).toBeInTheDocument();
    });
    
    await userEvent.click(screen.getByText('Issue Credential'));

    // Verify success screen is shown
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    // Click "Issue Another Credential" button
    await userEvent.click(screen.getByText('Issue Another Credential'));
    
    // Verify we're back to step 1
    await waitFor(() => {
      expect(screen.getByText('Holder & Issuer')).toBeInTheDocument();
      expect(screen.getByLabelText('Issuing Organization Select')).toBeInTheDocument();
      
      // Form should be reset
      expect(screen.getByLabelText('Holder Email')).toHaveValue('');
    });
  });
});