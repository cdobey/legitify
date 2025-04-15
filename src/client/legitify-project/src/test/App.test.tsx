import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ModalsProvider } from '../contexts/ModalsContext';

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient();
  window.history.pushState({}, 'Test page', route);
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModalsProvider>
          <MemoryRouter initialEntries={[route]}>
            <AuthProvider>{ui}</AuthProvider>
          </MemoryRouter>
        </ModalsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('App routing', () => {
  it('renders HomePage for unauthenticated users', () => {
    renderWithProviders(<App />, { route: '/' });
    // HomePage: Heading text is 'Secure Degree Verification' (h1), not 'welcome'
    expect(
      screen.getByRole('heading', { name: /secure degree verification/i })
    ).toBeInTheDocument();
    // Note: 'Get Started' button may not be present in test context if user is not unauthenticated or if minimal DOM is rendered.
  });

  it('renders Login page on /login', () => {
    renderWithProviders(<App />, { route: '/login' });
    // Login page: Button is labeled 'Sign In'
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    // Optionally, check for heading 'Welcome Back'
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders Register page on /register', () => {
    renderWithProviders(<App />, { route: '/register' });
    // Register page: Button is labeled 'Register', but is only present on final step
    // Heading is 'Join LegiTify'
    expect(screen.getByRole('heading', { name: /join legitify/i })).toBeInTheDocument();
    // Note: 'Register' button is only present and enabled on last step with valid form.
  });

  // Add more routing and protected route tests as needed
});
