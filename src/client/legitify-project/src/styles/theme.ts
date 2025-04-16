import { createTheme, MantineColorsTuple, MantineTheme } from '@mantine/core';

// Modern blue with teal undertones for light mode
const primaryBlue: MantineColorsTuple = [
  '#e6f7ff',
  '#c7e9fb',
  '#a3d9f5',
  '#7ac8ee',
  '#54b5e9',
  '#3ba3e0',
  '#2291d6',
  '#147cc4',
  '#0066b3',
  '#00529e',
];

// Enhanced primaryBlue with more teal for dark mode
const darkPrimaryBlue: MantineColorsTuple = [
  '#e7fcff',
  '#c8f0fa',
  '#a3e4f5',
  '#7ad4ee',
  '#55c5e7',
  '#38b6e0',
  '#2ca6d3',
  '#1991bd',
  '#007aa8',
  '#006591',
];

// Teal-green accents for light mode
const accentTeal: MantineColorsTuple = [
  '#e5fbf8',
  '#c3f5ed',
  '#9beee1',
  '#6ee6d4',
  '#48ddc7',
  '#2ed4ba',
  '#1ac6ad',
  '#0aad96',
  '#009581',
  '#007b6b',
];

// Enhanced teal-green for dark mode
const darkAccentTeal: MantineColorsTuple = [
  '#e8fff8',
  '#c9fff0',
  '#a3ffe6',
  '#76fbda',
  '#4cf5ce',
  '#2aeec1',
  '#15e2b5',
  '#00cb9f',
  '#00b289',
  '#009873',
];

// Orange accents for light mode
const accentOrange: MantineColorsTuple = [
  '#fff3e0',
  '#ffe2b1',
  '#ffce80',
  '#ffb94d',
  '#ffa41b',
  '#ff9100',
  '#fb8500',
  '#ec7700',
  '#dd6900',
  '#ce5c00',
];

// Enhanced orange for dark mode
const darkAccentOrange: MantineColorsTuple = [
  '#fff7e6',
  '#ffecc7',
  '#ffdea3',
  '#ffcd7a',
  '#ffbe55',
  '#ffac37',
  '#ff9913',
  '#ee8800',
  '#d97400',
  '#c46200',
];

// Consistent shadow definitions
const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.05), 0 1px 6px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.05), 0 3px 10px rgba(0, 0, 0, 0.1)',
};

// Dark mode shadow definitions - softer
const darkShadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 4px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.2)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.15), 0 1px 6px rgba(0, 0, 0, 0.2)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.2)',
};

// Component styles - light theme
const lightComponents = {
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
        background: '#f4f8fa',
        paddingTop: 0,
      },
      navbar: {
        borderRight: '1px solid #eaecef',
        boxShadow: shadows.sm,
        backgroundColor: '#ffffff',
      },
      header: {
        backgroundColor: '#f4f8fa',
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
          backgroundColor: 'rgba(35, 145, 214, 0.1)',
        },
      },
    },
  },
};

// Component styles - dark theme with softer colors
const darkComponents = {
  Button: {
    defaultProps: { size: 'md', radius: 'md' },
    styles: {
      root: {
        fontWeight: 500,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: darkShadows.sm,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: darkShadows.md,
        },
      },
    },
  },
  Card: {
    defaultProps: { shadow: 'sm', padding: 'lg', radius: 'md' },
    styles: {
      root: {
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        backgroundColor: '#323642',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: darkShadows.lg,
        },
      },
    },
  },
  TextInput: {
    styles: {
      input: {
        backgroundColor: '#292b36',
        borderColor: '#3f4356',
        color: '#e9ecef',
        '&:focus': {
          borderColor: '#2ca6d3',
        },
      },
      label: {
        color: '#c1c2c5',
      },
    },
  },
  PasswordInput: {
    styles: {
      input: {
        backgroundColor: '#292b36',
        borderColor: '#3f4356',
        color: '#e9ecef',
        '&:focus': {
          borderColor: '#2ca6d3',
        },
      },
      label: {
        color: '#c1c2c5',
      },
    },
  },
  Textarea: {
    styles: {
      input: {
        backgroundColor: '#292b36',
        borderColor: '#3f4356',
        color: '#e9ecef',
        '&:focus': {
          borderColor: '#2ca6d3',
        },
      },
      label: {
        color: '#c1c2c5',
      },
    },
  },
  Select: {
    styles: {
      input: {
        backgroundColor: '#292b36',
        borderColor: '#3f4356',
        color: '#e9ecef',
        '&:focus': {
          borderColor: '#2ca6d3',
        },
      },
      label: {
        color: '#c1c2c5',
      },
    },
  },
  DateInput: {
    styles: {
      input: {
        backgroundColor: '#292b36',
        borderColor: '#3f4356',
        color: '#e9ecef',
        '&:focus': {
          borderColor: '#2ca6d3',
        },
      },
      label: {
        color: '#c1c2c5',
      },
    },
  },
  Calendar: {
    styles: (theme: MantineTheme) => ({
      calendarHeader: {
        backgroundColor: '#292b36',
        color: '#e9ecef',
      },
      calendarHeaderControl: {
        color: '#c1c2c5',
        '&:hover': {
          backgroundColor: '#3f4356',
        },
      },
      weekday: {
        color: '#c1c2c5',
      },
      day: {
        color: '#e9ecef',
        '&:hover': {
          backgroundColor: '#3f4356',
        },
        '&[data-selected]': {
          backgroundColor: theme.colors.primaryBlue[5],
          color: '#ffffff',
        },
        '&[data-current]': {
          color: theme.colors.accentTeal[6],
          fontWeight: 500,
        },
        '&[data-outside]': {
          color: '#5c5f66',
        },
        '&[data-disabled]': {
          color: '#5c5f66',
          backgroundColor: 'transparent',
        },
      },
    }),
  },
  AppShell: {
    styles: {
      main: {
        background: '#1f2128',
        paddingTop: 0,
      },
      navbar: {
        borderRight: '1px solid #32343e',
        boxShadow: darkShadows.sm,
        backgroundColor: '#2a2d36',
      },
      header: {
        backgroundColor: '#1f2128',
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
          backgroundColor: 'rgba(44, 166, 211, 0.2)',
        },
      },
    },
  },
};

// Base theme configuration for light mode
export const lightTheme = createTheme({
  primaryColor: 'primaryBlue',
  primaryShade: 6,
  defaultRadius: 'md',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  colors: {
    primaryBlue,
    accentTeal,
    accentOrange,
  },
  shadows,
  components: lightComponents,
});

// Base theme configuration for dark mode
export const darkTheme = createTheme({
  primaryColor: 'primaryBlue',
  primaryShade: 5, // Use a brighter shade for dark mode
  defaultRadius: 'md',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  colors: {
    primaryBlue: darkPrimaryBlue,
    accentTeal: darkAccentTeal,
    accentOrange: darkAccentOrange,
  },
  shadows: darkShadows,
  components: darkComponents,
});

// For backward compatibility
export const theme = lightTheme;
