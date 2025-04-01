import { ModalsProvider as MantineModalsProvider } from '@mantine/modals';
import { ReactNode } from 'react';

interface ModalsProviderProps {
  children: ReactNode;
}

export function ModalsProvider({ children }: ModalsProviderProps) {
  return (
    <MantineModalsProvider
      modalProps={{
        centered: true,
        overlayProps: {
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
        zIndex: 1000, // Ensure modals appear above all other elements
      }}
    >
      {children}
    </MantineModalsProvider>
  );
}
