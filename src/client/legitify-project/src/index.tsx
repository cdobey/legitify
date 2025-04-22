import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { queryClient } from './config/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { ModalsProvider } from './contexts/ModalsContext';
import { StatusProvider } from './contexts/StatusContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/index.css';

const interFontLink = document.createElement('link');
interFontLink.rel = 'stylesheet';
interFontLink.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
document.head.appendChild(interFontLink);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.remove();
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModalsProvider>
          <Notifications position="bottom-right" zIndex={9999} />
          <BrowserRouter>
            <StatusProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </StatusProvider>
          </BrowserRouter>
        </ModalsProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
