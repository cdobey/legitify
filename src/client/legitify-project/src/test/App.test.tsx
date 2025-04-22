import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ModalsProvider } from '../contexts/ModalsContext';
import { StatusProvider } from '../contexts/StatusContext';
import { ThemeProvider } from '../contexts/ThemeContext';

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient();
  window.history.pushState({}, 'Test page', route);
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModalsProvider>
          <MemoryRouter initialEntries={[route]}>
            <StatusProvider>
              <AuthProvider>{ui}</AuthProvider>
            </StatusProvider>
          </MemoryRouter>
        </ModalsProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('App routing', () => {
  it('renders HomePage for unauthenticated users', () => {
    renderWithProviders(<App />, { route: '/' });
    // Check for the main heading "Secure Credential Verification"
    expect(
      screen.getByRole('heading', { level: 1, name: /secure credential verification/i }),
    ).toBeInTheDocument();
    // Check for FAQ section which is unique to HomePage
    expect(
      screen.getByRole('heading', { name: /frequently asked questions/i }),
    ).toBeInTheDocument();
  });

  it('renders Login page on /login', () => {
    renderWithProviders(<App />, { route: '/login' });
    // Check for Welcome Back heading and Sign In button
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders Register page on /register', () => {
    renderWithProviders(<App />, { route: '/register' });
    // Check for Join LegiTify heading which is unique to the registration page
    expect(screen.getByRole('heading', { name: /join legitify/i })).toBeInTheDocument();
  });
});
