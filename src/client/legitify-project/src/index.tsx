import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { queryClient } from './config/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { ModalsProvider } from './contexts/ModalsContext';
import './styles/index.css';
import { theme } from './styles/theme';

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
      <MantineProvider theme={theme}>
        <ModalsProvider>
          <Notifications />
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ModalsProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
