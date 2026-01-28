import { Box, Card, Group, Stack, Text } from '@mantine/core';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  isDate?: boolean;
}

export default function StatCard({ title, value, icon, isDate }: StatCardProps) {
  // Generate a test ID from the title
  const testId = `stat-card-value-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Card withBorder p="md">
      <Group align="flex-start" gap="sm">
        <Box mt={4}>{icon}</Box>
        <Stack gap={0} style={{ flex: 1 }}>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
          <Text
            size="lg"
            fw={500}
            style={{ wordBreak: isDate ? 'break-word' : 'normal' }}
            data-testid={testId}
          >
            {value}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
