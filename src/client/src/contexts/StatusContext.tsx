import { ServiceStatus } from '@/api/auth/auth.models';
import { useBackendStatusQuery, useLedgerStatusQuery } from '@/api/auth/auth.queries';
import { createContext, ReactNode, useContext } from 'react';

interface StatusContextType {
  backendStatus: {
    status: ServiceStatus | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  ledgerStatus: {
    status: ServiceStatus | undefined;
    isLoading: boolean;
    isError: boolean;
  };
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: ReactNode }) {
  const {
    data: backendData,
    isLoading: backendLoading,
    isError: backendError,
  } = useBackendStatusQuery();

  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    isError: ledgerError,
  } = useLedgerStatusQuery();

  const value = {
    backendStatus: {
      status: backendData,
      isLoading: backendLoading,
      isError: backendError,
    },
    ledgerStatus: {
      status: ledgerData,
      isLoading: ledgerLoading,
      isError: ledgerError,
    },
  };

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
}
