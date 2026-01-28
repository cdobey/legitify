import { useStatus } from '@/contexts/StatusContext';
import { Box, Group, Popover, Text, useMantineTheme } from '@mantine/core';
import { IconCircleCheck, IconCircleDashed, IconExclamationCircle } from '@tabler/icons-react';
import React from 'react';

interface StatusIndicatorProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number;
}

export function StatusIndicator({ position = 'bottom-right', size = 40 }: StatusIndicatorProps) {
  const { backendStatus, ledgerStatus } = useStatus();
  const theme = useMantineTheme();

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-right':
        return { bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-left':
        return { top: '20px', left: '20px' };
      default:
        return { bottom: '20px', right: '20px' };
    }
  };

  const getCombinedStatusIndicator = () => {
    const isBackendLoading = backendStatus.isLoading;
    const isLedgerLoading = ledgerStatus.isLoading;
    const isBackendError = backendStatus.isError;
    const isLedgerError = ledgerStatus.isError;
    const isBackendOnline = backendStatus.status?.online;
    const isLedgerOnline = ledgerStatus.status?.online;

    if (isBackendLoading || isLedgerLoading) {
      return {
        icon: <IconCircleDashed size={20} />,
        color: theme.colors.gray[6],
        text: 'Checking...',
      };
    }

    if (isBackendError || !isBackendOnline) {
      return {
        icon: <IconExclamationCircle size={20} />,
        color: theme.colors.red[6],
        text: 'No Connection',
      };
    }

    if (isBackendOnline && (isLedgerError || !isLedgerOnline)) {
      return {
        icon: <IconExclamationCircle size={20} />,
        color: theme.colors.yellow[6],
        text: 'Partial Connection',
      };
    }

    return {
      icon: <IconCircleCheck size={20} />,
      color: theme.colors.green[6],
      text: 'Connected',
    };
  };

  const combinedStatus = getCombinedStatusIndicator();
  const iconSize = Math.floor(size * 0.5);

  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Popover width={260} position="top" withArrow shadow="md">
      <Popover.Target>
        <Box
          style={{
            position: 'fixed',
            ...getPositionStyles(),
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            width: `${size}px`,
            height: `${size}px`,
            backdropFilter: 'blur(4px)',
            padding: 0,
          }}
        >
          <Box
            style={{
              color: combinedStatus.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              lineHeight: 0,
            }}
          >
            {React.cloneElement(combinedStatus.icon, {
              size: iconSize,
              style: { display: 'block' },
            })}
          </Box>
        </Box>
      </Popover.Target>

      <Popover.Dropdown>
        <Text fw={600} size="sm" mb="xs">
          System Status
        </Text>

        <Group mb="xs">
          <Box
            style={{
              color: backendStatus.status?.online ? theme.colors.green[6] : theme.colors.red[6],
            }}
          >
            {backendStatus.status?.online ? (
              <IconCircleCheck size={16} />
            ) : (
              <IconExclamationCircle size={16} />
            )}
          </Box>
          <Box>
            <Text size="sm" fw={500}>
              Backend: {backendStatus.status?.online ? 'Online' : 'Offline'}
            </Text>
            <Text size="xs" c="dimmed">
              Last checked: {formatTimestamp(backendStatus.status?.timestamp)}
            </Text>
          </Box>
        </Group>

        <Group>
          <Box
            style={{
              color: ledgerStatus.status?.online ? theme.colors.green[6] : theme.colors.red[6],
            }}
          >
            {ledgerStatus.status?.online ? (
              <IconCircleCheck size={16} />
            ) : (
              <IconExclamationCircle size={16} />
            )}
          </Box>
          <Box>
            <Text size="sm" fw={500}>
              Ledger: {ledgerStatus.status?.online ? 'Online' : 'Offline'}
            </Text>
            <Text size="xs" c="dimmed">
              Last checked: {formatTimestamp(ledgerStatus.status?.timestamp)}
            </Text>
          </Box>
        </Group>

        <Text size="xs" ta="center" mt="xs" style={{ opacity: 0.7 }}>
          Auto-refreshing every 30 seconds
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
