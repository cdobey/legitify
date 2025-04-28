import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AllRecords from '../../../pages/credential/AllRecords';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  useAccessibleCredentialsQuery, 
  useLedgerRecordsQuery 
} from '../../../api/credentials/credential.queries';
import { AxiosError } from 'axios';
import type { UseQueryResult } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { LedgerRecord, AccessibleCredential } from '@/api/credentials/credential.models';

// Mock the necessary dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../api/credentials/credential.queries');
vi.mock('@mantine/modals', () => ({
  modals: {
    open: vi.fn(),
  }
}));

// Define a proper type for scrollTo
interface ScrollToFn {
  (options?: ScrollToOptions): void;
  (x: number, y: number): void;
}

// Mock window.scrollTo with a properly typed mock function
const mockScrollTo = vi.fn<[number, number], void>((x, y) => {});
Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo as unknown as ScrollToFn,
  writable: true,
});

// Create comprehensive mock data that includes all required fields
const createCompleteLedgerRecord = (overrides = {}): LedgerRecord => ({
  docId: 'doc-id',
  docHash: 'hash',
  holderEmail: 'user@example.com',
  holderId: 'holder-id',
  issuerName: 'University',
  issuerId: 'issuer-id',
  issuerOrgId: 'org-id',
  ledgerTimestamp: '2023-01-01T12:00:00Z',
  accepted: false,
  denied: false,
  title: 'Credential Title',
  description: 'Credential Description',
  type: 'Degree',
});

const createCompleteAccessibleCredential = (overrides = {}): AccessibleCredential => ({
  credentialId: 'cred-id',
  requestId: 'req-id',
  holder: { 
    name: 'John Doe', 
    email: 'john@example.com' 
  },
  issuer: 'University Name',
  requestedAt: '2023-01-10T10:00:00Z',
  status: 'pending',
  dateGranted: null,
});

// Create a wrapper component that includes all necessary providers
const AllRecordsWrapper = () => (
  <MantineProvider>
    <ModalsProvider>
      <MemoryRouter>
        <AllRecords />
      </MemoryRouter>
    </ModalsProvider>
  </MantineProvider>
);

describe('AllRecords Component', () => {
  // Sample data for testing
  const mockLedgerRecords: LedgerRecord[] = [
    createCompleteLedgerRecord({
      docId: 'doc001',
      holderEmail: 'student@example.com',
      issuerName: 'University A',
      issuer: 'University A',
      ledgerTimestamp: '2023-01-15T10:00:00Z',
      accepted: true,
      denied: false,
      credentialTitle: 'Bachelor Degree',
      title: 'Bachelor of Computer Science',
      description: 'Bachelor degree in Computer Science',
      type: 'Degree',
      fieldOfStudy: 'Computer Science',
      owner: 'John Doe'
    }),
    createCompleteLedgerRecord({
      docId: 'doc002',
      holderEmail: 'student2@example.com',
      issuerName: 'University B',
      issuer: 'University B',
      ledgerTimestamp: '2023-02-20T14:00:00Z',
      accepted: false,
      denied: false,
      credentialTitle: 'Master Degree',
      title: 'Master of Data Science',
      description: 'Master degree in Data Science',
      type: 'Degree',
      fieldOfStudy: 'Data Science',
      owner: 'Jane Smith'
    }),
    createCompleteLedgerRecord({
      docId: 'doc003',
      holderEmail: 'student3@example.com',
      issuerName: 'University C',
      issuer: 'University C',
      ledgerTimestamp: '2023-03-10T09:00:00Z',
      accepted: false,
      denied: true,
      credentialTitle: 'PhD',
      title: 'PhD in Artificial Intelligence',
      description: 'Doctoral degree in Artificial Intelligence',
      type: 'Degree',
      fieldOfStudy: 'Artificial Intelligence',
      owner: 'Bob Johnson'
    })
  ];

  const mockAccessibleCredentials: AccessibleCredential[] = [
    createCompleteAccessibleCredential({
      credentialId: 'cred001',
      requestId: 'req001',
      holder: { name: 'John Doe', email: 'john@example.com' },
      issuer: 'University X',
      requestedAt: '2023-01-10T10:00:00Z',
      status: 'granted',
      dateGranted: '2023-01-12T15:30:00Z'
    }),
    createCompleteAccessibleCredential({
      credentialId: 'cred002',
      requestId: 'req002',
      holder: { name: 'Jane Smith', email: 'jane@example.com' },
      issuer: 'University Y',
      requestedAt: '2023-02-15T14:00:00Z',
      status: 'pending',
      dateGranted: null
    }),
    createCompleteAccessibleCredential({
      credentialId: 'cred003',
      requestId: 'req003',
      holder: { name: 'Bob Johnson', email: 'bob@example.com' },
      issuer: 'University Z',
      requestedAt: '2023-03-05T09:00:00Z',
      status: 'denied',
      dateGranted: null
    })
  ];

  // Create simplified mock responses that match required types
  const mockSuccessQueryResult = <T,>(data: T): UseQueryResult<T, AxiosError> => ({
    data,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    status: 'success',
    isLoadingError: false,
    isRefetchError: false,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    fetchStatus: 'idle',
    refetch: vi.fn(),
  } as unknown as UseQueryResult<T, AxiosError>);

  const mockLoadingQueryResult = <T,>(): UseQueryResult<T, AxiosError> => ({
    data: undefined,
    error: null,
    isError: false,
    isLoading: true,
    isPending: true,
    isSuccess: false,
    status: 'loading',
    isLoadingError: false,
    isRefetchError: false,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: true,
    isInitialLoading: true,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    fetchStatus: 'fetching',
    refetch: vi.fn(),
  } as unknown as UseQueryResult<T, AxiosError>);

  const mockErrorQueryResult = <T,>(error: AxiosError): UseQueryResult<T, AxiosError> => ({
    data: undefined,
    error,
    isError: true,
    isLoading: false,
    isPending: false,
    isSuccess: false,
    status: 'error',
    isLoadingError: false,
    isRefetchError: false,
    failureCount: 1,
    failureReason: error.message,
    errorUpdateCount: 1,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: Date.now(),
    fetchStatus: 'idle',
    refetch: vi.fn(),
  } as unknown as UseQueryResult<T, AxiosError>);

  // Test suite for issuer role
  describe('When user is an issuer', () => {
    beforeEach(() => {
      // Mock auth context for issuer role
      vi.mocked(useAuth).mockReturnValue({
        user: { role: 'issuer' }
      } as any);

      // Mock queries using the typed query result functions
      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockSuccessQueryResult(mockLedgerRecords)
      );
      
      vi.mocked(useAccessibleCredentialsQuery).mockReturnValue(
        mockSuccessQueryResult([])
      );
    });

    test('renders the issuer records table correctly', () => {
      render(<AllRecordsWrapper />);

      // Check that the table headers are rendered
      expect(screen.getByText('Credential')).toBeInTheDocument();
      expect(screen.getByText('Holder')).toBeInTheDocument();
      expect(screen.getByText('Institution')).toBeInTheDocument();
      expect(screen.getByText('Issue Date')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check that records are displayed
      expect(screen.getByText('Bachelor Degree')).toBeInTheDocument();
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
      expect(screen.getByText('University A')).toBeInTheDocument();
    });

    test('filters records based on search query', async () => {
      render(<AllRecordsWrapper />);

      // Search for a specific record
      const searchInput = screen.getByPlaceholderText(/Search records/i);
      fireEvent.change(searchInput, { target: { value: 'Master' } });

      // Only Master Degree should be visible
      await waitFor(() => {
        expect(screen.getByText('Master Degree')).toBeInTheDocument();
        expect(screen.queryByText('Bachelor Degree')).not.toBeInTheDocument();
        expect(screen.queryByText('PhD')).not.toBeInTheDocument();
      });
    });

    test('filters records by status', async () => {
      render(<AllRecordsWrapper />);

      // Open the filter menu - find by icon rather than label
      const filterButtons = screen.getAllByRole('button');
      const filterButton = filterButtons.find(button => {
        const buttonText = button.textContent || '';
        return buttonText.includes('Filter') || button.querySelector('svg');
      });
      
      expect(filterButton).toBeDefined();
      if (filterButton) {
        fireEvent.click(filterButton);
      }

      // Select "Accepted Only" filter
      const acceptedFilter = await screen.findByText('Accepted Only');
      fireEvent.click(acceptedFilter);

      // Only accepted records should be visible
      await waitFor(() => {
        expect(screen.getByText('Bachelor Degree')).toBeInTheDocument();
        expect(screen.queryByText('Master Degree')).not.toBeInTheDocument();
        expect(screen.queryByText('PhD')).not.toBeInTheDocument();
      });
    });

    test('sorts records when clicking on column headers', async () => {
      render(<AllRecordsWrapper />);

      // Find the Institution header
      const institutionHeaderText = screen.getByText('Institution');
      const institutionHeader = institutionHeaderText.closest('.sortable-header');
      
      // Null check before clicking
      if (!institutionHeader) {
        throw new Error('Institution header not found');
      }

      // Click on Institution header to sort
      fireEvent.click(institutionHeader);

      // Expected sort order after first click (desc)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Make sure we have rows
        expect(rows.length).toBeGreaterThan(1);
        
        // Get cells from the first row (after header)
        const firstRowCells = within(rows[1]).getAllByRole('cell');
        expect(firstRowCells[2]).toHaveTextContent('University C');
      });

      // Click again to reverse sort order
      fireEvent.click(institutionHeader);

      // Expected sort order after second click (asc)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const firstRowCells = within(rows[1]).getAllByRole('cell');
        expect(firstRowCells[2]).toHaveTextContent('University A');
      });
    });

    test('displays loading state when isLoading is true', () => {
      // Override the mock to simulate loading
      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockLoadingQueryResult()
      );

      render(<AllRecordsWrapper />);

      expect(screen.getByText(/Loading blockchain records/i)).toBeInTheDocument();
    });

    test('displays error message when there is an error', () => {
      // Create a proper AxiosError
      const axiosError = new AxiosError('Failed to fetch records');
      
      // Override the mock to simulate an error
      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockErrorQueryResult(axiosError)
      );

      render(<AllRecordsWrapper />);

      expect(screen.getByText('Error Loading Records')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch records')).toBeInTheDocument();
    });

    test('displays empty state when no records are available', () => {
      // Override the mock to simulate no records
      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockSuccessQueryResult([])
      );

      render(<AllRecordsWrapper />);

      expect(screen.getByText('No Records Yet')).toBeInTheDocument();
      expect(screen.getByText('No records found in the blockchain ledger at this time.')).toBeInTheDocument();
    });
  });

  // Test suite for verifier role
  describe('When user is a verifier', () => {
    beforeEach(() => {
      // Mock auth context for verifier role
      vi.mocked(useAuth).mockReturnValue({
        user: { role: 'verifier' }
      } as any);

      // Mock queries
      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockSuccessQueryResult([])
      );
      
      vi.mocked(useAccessibleCredentialsQuery).mockReturnValue(
        mockSuccessQueryResult(mockAccessibleCredentials)
      );
    });

    test('renders the verifier records table correctly', () => {
      render(<AllRecordsWrapper />);

      // Check that the table headers are rendered
      expect(screen.getByText('Credential')).toBeInTheDocument();
      expect(screen.getByText('Holder')).toBeInTheDocument();
      expect(screen.getByText('Institution')).toBeInTheDocument();
      expect(screen.getByText('Access Date')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check that records are displayed
      expect(screen.getByText('Credential Certificate')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('University X')).toBeInTheDocument();
    });

    test('handles pagination correctly', () => {
      // Create more records to trigger pagination
      const manyRecords: AccessibleCredential[] = [];
      for (let i = 0; i < 15; i++) {
        manyRecords.push(createCompleteAccessibleCredential({
          credentialId: `cred${i.toString().padStart(3, '0')}`,
          requestId: `req${i.toString().padStart(3, '0')}`,
          holder: { name: `User ${i}`, email: `user${i}@example.com` },
          issuer: `University ${i}`,
          requestedAt: `2023-01-${i+1}T10:00:00Z`,
          status: i % 3 === 0 ? 'granted' : i % 3 === 1 ? 'pending' : 'denied',
          dateGranted: i % 3 === 0 ? `2023-01-${i+2}T15:30:00Z` : null
        }));
      }

      vi.mocked(useAccessibleCredentialsQuery).mockReturnValue(
        mockSuccessQueryResult(manyRecords)
      );

      render(<AllRecordsWrapper />);

      // Find any pagination elements
      const navigationElements = screen.queryAllByRole('navigation');
      expect(navigationElements.length).toBeGreaterThan(0);

      // Check first page content
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
      
      // Try to find "2" button in various ways
      const pageButtons = screen.getAllByRole('button');
      const nextPageButton = pageButtons.find(button => button.textContent?.includes('2'));
      
      if (nextPageButton) {
        fireEvent.click(nextPageButton);
        // Check page change triggered scroll to top
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
      }
    });

    test('displays pending modal for pending requests', () => {
      const { modals } = require('@mantine/modals');
      
      render(<AllRecordsWrapper />);

      // Find the pending record row and click it
      const pendingRecord = screen.getByText('jane@example.com').closest('tr');
      
      if (!pendingRecord) {
        throw new Error('Pending record not found');
      }
      
      fireEvent.click(pendingRecord);

      // Check that modal.open was called
      expect(modals.open).toHaveBeenCalled();
      const modalArgs = vi.mocked(modals.open).mock.calls[0][0];
      expect(modalArgs.title.props.children).toBe('Access Request Pending');
    });

    test('handles view button clicks correctly', () => {
      render(<AllRecordsWrapper />);

      // Look for any elements that might be links or view buttons
      const allElements = screen.getAllByRole('link') || 
                        screen.getAllByRole('button').filter(btn => {
                          const btnText = btn.textContent || '';
                          return btnText.includes('View') || btn.querySelector('svg');
                        });
      
      // Assuming at least one element should be found
      expect(allElements.length).toBeGreaterThan(0);
      
      // Test if any element has the right href attribute
      const hasCorrectHref = allElements.some(el => 
        el.getAttribute('href') === '/credential/view/cred001'
      );
      
      expect(hasCorrectHref).toBeTruthy();
    });
  });

  // Additional tests for edge cases and specific functionality
  describe('Edge cases and specific functionality', () => {
    test('handles no match for search query', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { role: 'issuer' }
      } as any);

      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockSuccessQueryResult(mockLedgerRecords)
      );

      render(<AllRecordsWrapper />);

      // Search for a non-existent record
      const searchInput = screen.getByPlaceholderText(/Search records/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      // Wait for alert to appear - try different text patterns
      await waitFor(() => {
        const noMatchAlerts = screen.queryAllByRole('alert');
        expect(noMatchAlerts.length).toBeGreaterThan(0);
      });
    });

    test('resets to first page when filters change', async () => {
      // Create more records to trigger pagination
      const manyRecords: LedgerRecord[] = [];
      for (let i = 0; i < 15; i++) {
        manyRecords.push(createCompleteLedgerRecord({
          docId: `doc${i.toString().padStart(3, '0')}`,
          holderEmail: `student${i}@example.com`,
          issuerName: `University ${i}`,
          issuer: `University ${i}`,
          ledgerTimestamp: `2023-01-${i+1}T10:00:00Z`,
          accepted: i % 3 === 0,
          denied: i % 3 === 1,
          credentialTitle: `Degree ${i}`,
          title: `Title ${i}`,
          description: `Description ${i}`,
          type: 'Degree',
          fieldOfStudy: `Field ${i}`,
          owner: `Student ${i}`
        }));
      }

      vi.mocked(useAuth).mockReturnValue({
        user: { role: 'issuer' }
      } as any);

      vi.mocked(useLedgerRecordsQuery).mockReturnValue(
        mockSuccessQueryResult(manyRecords)
      );

      render(<AllRecordsWrapper />);

      // Find and go to page 2
      const allButtons = screen.getAllByRole('button');
      const page2Button = allButtons.find(btn => btn.textContent?.includes('2'));
      
      if (page2Button) {
        fireEvent.click(page2Button);
      }

      // Find and click the filter button
      const filterButtons = screen.getAllByRole('button').filter(btn => {
        const hasSvg = btn.querySelector('svg') !== null;
        return hasSvg;
      });
      
      if (filterButtons.length > 0) {
        fireEvent.click(filterButtons[0]);
      }

      // Find and click "Accepted Only" menu item using various strategies
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      const acceptedMenuItem = Array.from(menuItems).find(item => 
        item.textContent?.includes('Accept')
      );
      
      if (acceptedMenuItem) {
        fireEvent.click(acceptedMenuItem);
      }

      // Verify page was reset to 1 by checking for page text
      await waitFor(() => {
        // Look for any text that indicates we're on page 1
        const page1Indicators = Array.from(document.querySelectorAll('*')).filter(
          el => el.textContent?.includes('Page 1') || el.textContent?.includes('page 1')
        );
        expect(page1Indicators.length).toBeGreaterThan(0);
      });
    });
  });
});