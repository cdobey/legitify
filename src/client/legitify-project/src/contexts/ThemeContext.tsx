import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { darkTheme, lightTheme } from '../styles/theme';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setLightTheme: () => void;
  setDarkTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  setLightTheme: () => {},
  setDarkTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage or default to light
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('legitify-theme');
    return savedTheme === 'dark';
  });

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const setLightTheme = () => setIsDarkMode(false);
  const setDarkTheme = () => setIsDarkMode(true);

  // Persist theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('legitify-theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    // Also apply to HTML element for initial loader
    document.querySelector('html')?.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setLightTheme, setDarkTheme }}>
      <ColorSchemeScript forceColorScheme={isDarkMode ? 'dark' : 'light'} />
      <MantineProvider
        theme={isDarkMode ? darkTheme : lightTheme}
        forceColorScheme={isDarkMode ? 'dark' : 'light'}
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
