import { useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { ModalsProvider as MantineModalsProvider } from '@mantine/modals';
import { ReactNode, useEffect, useState } from 'react';

interface ModalsProviderProps {
  children: ReactNode;
}

export function ModalsProvider({ children }: ModalsProviderProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  // Update when color scheme changes
  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  return (
    <MantineModalsProvider
      modalProps={{
        centered: true,
        overlayProps: {
          color: isDark ? theme.colors.dark[9] : theme.colors.gray[2],
          opacity: 0.55,
          blur: 3,
        },
        transitionProps: {
          transition: 'fade',
          duration: 200,
        },
        padding: 'xl',
        shadow: 'xl',
        radius: 'md',
        zIndex: 200,
        styles: {
          header: {
            backgroundColor: 'transparent',
            borderBottom: isDark ? `1px solid ${theme.colors.dark[4]}` : '1px solid #eaecef',
            paddingBottom: 10,
          },
          title: {
            fontSize: '1.1rem',
            fontWeight: 600,
            color: isDark ? theme.colors.gray[0] : theme.colors.dark[8],
          },
          content: {
            backgroundColor: isDark ? '#323642' : undefined,
          },
          body: {
            backgroundColor: isDark ? '#323642' : undefined,
            paddingTop: 15,
          },
          close: {
            color: isDark ? theme.colors.gray[5] : theme.colors.gray[6],
            '&:hover': {
              backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[0],
            },
          },
        },
      }}
    >
      {children}
    </MantineModalsProvider>
  );
}
