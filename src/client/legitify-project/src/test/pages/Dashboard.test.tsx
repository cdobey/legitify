// src/test/pages/Dashboard.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ModalsProvider } from '../../contexts/ModalsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Dashboard from '../../pages/Dashboard';

function renderDashboardWithProviders(route = '/dashboard') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModalsProvider>
          <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
              <Dashboard />
            </AuthProvider>
          </MemoryRouter>
        </ModalsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('Dashboard', () => {
  it('renders dashboard data from MSW', async () => {
    renderDashboardWithProviders();
    await waitFor(() => {
      // For unauthenticated users, an alert should be shown
      expect(screen.getByRole('alert')).toHaveTextContent(/please log in to access your dashboard/i);
    });
  });
});
