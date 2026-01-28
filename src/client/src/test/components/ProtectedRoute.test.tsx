import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the @mantine/core components
vi.mock('@mantine/core', () => ({
  Alert: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="alert" data-title={title}>
      {children}
    </div>
  ),
  Container: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

// Helper function to render the component with router
const renderWithRouter = (component: React.ReactNode, initialRoute = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/protected" element={component} />
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show nothing while loading', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    expect(container.innerHTML).toBe('');
  });

  it('should redirect to login when user is not authenticated', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('should render children when user is authenticated with no role requirements', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'holder' },
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should render children when user has required role', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'issuer' },
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute requiredRole="issuer">
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should show access denied when user does not have required role', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'holder' },
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute requiredRole="issuer">
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByTestId('alert').getAttribute('data-title')).toBe('Access Denied');
    expect(screen.getByTestId('alert').textContent).toBe(
      'You do not have permission to access this page.',
    );
  });

  it('should show custom denied message when provided', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'holder' },
      isLoading: false,
    });

    const customMessage = 'Custom access denied message';
    renderWithRouter(
      <ProtectedRoute requiredRole="issuer" deniedMessage={customMessage}>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('alert').textContent).toBe(customMessage);
  });

  it('should render children when user has one of allowed roles', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'verifier' },
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['issuer', 'verifier']}>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should show access denied when user does not have any of allowed roles', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'holder' },
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['issuer', 'verifier']}>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('should handle both requiredRole and allowedRoles props correctly', () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { role: 'verifier' },
      isLoading: false,
    });

    // Even though the required role is "issuer", the user has "verifier" which is in allowedRoles
    // The component should use allowedRoles over requiredRole
    renderWithRouter(
      <ProtectedRoute requiredRole="issuer" allowedRoles={['verifier', 'holder']}>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
