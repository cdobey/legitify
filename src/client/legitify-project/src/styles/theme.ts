import { createTheme, MantineColorsTuple } from '@mantine/core';

// Color Palettes
const primaryBlue: MantineColorsTuple = [
  '#e9f0ff',
  '#ccd9f2',
  '#a9bee6',
  '#84a3da',
  '#6389cf',
  '#4e78c9',
  '#3c6ac3',
  '#2a5ab0',
  '#174f9e',
  '#00448c',
];

const accentTeal: MantineColorsTuple = [
  '#e6fcf5',
  '#c3f8e9',
  '#9df3dc',
  '#74f0d1',
  '#4becc6',
  '#33e9bd',
  '#1ee7b8',
  '#00cda3',
  '#00b592',
  '#009d81',
];

const accentAmber: MantineColorsTuple = [
  '#fff8e1',
  '#ffecb3',
  '#ffe082',
  '#ffd54f',
  '#ffca28',
  '#ffc107',
  '#ffb300',
  '#ffa000',
  '#ff8f00',
  '#ff6f00',
];

// Consistent shadow definitions
const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.05), 0 1px 6px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.05), 0 3px 10px rgba(0, 0, 0, 0.1)',
};

// Component styles
const components = {
  Button: {
    defaultProps: { size: 'md', radius: 'md' },
    styles: {
      root: {
        fontWeight: 500,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: shadows.sm,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: shadows.md,
        },
      },
    },
  },
  Card: {
    defaultProps: { shadow: 'sm', padding: 'lg', radius: 'md' },
    styles: {
      root: {
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        backgroundColor: '#ffffff',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: shadows.lg,
        },
      },
    },
  },
  AppShell: {
    styles: {
      main: {
        background: '#f4f7fa',
        paddingTop: 0,
      },
      navbar: {
        borderRight: '1px solid #eaecef',
        boxShadow: shadows.sm,
        backgroundColor: '#ffffff',
      },
      header: {
        backgroundColor: '#f4f7fa',
        borderBottom: 'none',
        boxShadow: 'none',
      },
    },
  },
  NavLink: {
    styles: {
      root: {
        borderRadius: '8px',
        transition: 'background-color 0.2s ease',
        '&[data-active]': {
          backgroundColor: 'rgba(60, 106, 195, 0.1)',
        },
      },
    },
  },
};

export const theme = createTheme({
  primaryColor: 'primaryBlue',
  primaryShade: 6,
  defaultRadius: 'md',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  colors: { primaryBlue, accentTeal, accentAmber },
  shadows,
  components,
});
