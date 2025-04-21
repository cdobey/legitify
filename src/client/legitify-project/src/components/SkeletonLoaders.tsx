import {
  Box,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@mantine/core';
import { ReactNode } from 'react';

// Props for role-specific dashboard skeletons
interface DashboardSkeletonProps {
  userRole?: 'issuer' | 'holder' | 'verifier';
}

// Generic card skeleton for consistent spacing
export function CardSkeleton({
  height = 200,
  children,
}: {
  height?: number;
  children?: ReactNode;
}) {
  return (
    <Card withBorder p="md" radius="md" style={{ height }}>
      {children || (
        <>
          <Skeleton height={24} width="40%" mb="md" />
          <Skeleton height={16} width="70%" mb="sm" />
          <Skeleton height={16} width="90%" mb="lg" />
          <Group justify="flex-end">
            <Skeleton height={30} width={100} />
          </Group>
        </>
      )}
    </Card>
  );
}

// Reusable component for a welcome card skeleton
export function WelcomeCardSkeleton() {
  return (
    <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
      <Group justify="space-between" mb="md">
        <div>
          <Skeleton height={30} width="70%" mb="sm" />
          <Skeleton height={15} width="50%" />
        </div>
        <Skeleton height={50} circle />
      </Group>
    </Card>
  );
}

// Reusable component for quick actions skeleton
export function QuickActionsSkeleton({ columns = 2 }: { columns?: number }) {
  return (
    <Paper withBorder radius="md" p="md" mb="xl">
      <Skeleton height={24} width="30%" mb="md" />
      <SimpleGrid cols={{ base: 1, sm: columns }}>
        {Array(columns)
          .fill(0)
          .map((_, i) => (
            <Card key={i} withBorder radius="md" p="sm">
              <Group>
                <Skeleton height={44} circle />
                <div style={{ flex: 1 }}>
                  <Skeleton height={18} width="70%" mb="xs" />
                  <Skeleton height={12} width="90%" />
                </div>
              </Group>
            </Card>
          ))}
      </SimpleGrid>
    </Paper>
  );
}

// Reusable component for stats grid skeleton
export function StatsGridSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <Grid mb="xl">
      {Array(columns)
        .fill(0)
        .map((_, i) => (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={i}>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Skeleton height={12} width={80} />
                <Skeleton height={38} circle />
              </Group>
              <Skeleton height={30} mt="sm" />
            </Paper>
          </Grid.Col>
        ))}
    </Grid>
  );
}

// Reusable component for activity list skeleton
export function ActivityListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <Paper withBorder radius="md" p="md" mb="xl">
      <Group justify="space-between" mb="md">
        <Skeleton height={24} width="30%" />
        <Skeleton height={36} width={120} />
      </Group>

      <Stack>
        {Array(items)
          .fill(0)
          .map((_, i) => (
            <Card key={i} withBorder p="sm">
              <Group justify="space-between">
                <div style={{ flex: 1 }}>
                  <Skeleton height={18} width="60%" mb="xs" />
                  <Skeleton height={12} width="40%" />
                </div>
                <Skeleton height={24} width={80} radius="xl" />
              </Group>
              <Skeleton height={12} width="30%" mt="xs" />
            </Card>
          ))}
      </Stack>
    </Paper>
  );
}

// Reusable component for progress bars skeleton
export function ProgressBarsSkeleton({ bars = 3 }: { bars?: number }) {
  return (
    <Paper withBorder radius="md" p="md" mb="xl">
      <Skeleton height={24} width="30%" mb="lg" />

      {Array(bars)
        .fill(0)
        .map((_, i) => (
          <Box key={i} mb={i < bars - 1 ? 'md' : 0}>
            <Group justify="space-between" mb={5}>
              <Skeleton height={14} width={80} />
              <Skeleton height={14} width={50} />
            </Group>
            <Skeleton height={16} radius="xl" />
          </Box>
        ))}
    </Paper>
  );
}

// Reusable component for dual column skeleton layout
export function DualColumnSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
      {Array(2)
        .fill(0)
        .map((_, i) => (
          <Paper key={i} withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Skeleton height={24} width="40%" />
              <Skeleton height={36} width={100} />
            </Group>

            <Stack>
              {Array(3)
                .fill(0)
                .map((_, j) => (
                  <Card key={j} withBorder p="sm">
                    <Skeleton height={18} width="70%" mb="xs" />
                    <Group justify="space-between">
                      <Skeleton height={12} width="50%" />
                      <Skeleton height={24} width={80} radius="xl" />
                    </Group>
                  </Card>
                ))}
            </Stack>
          </Paper>
        ))}
    </SimpleGrid>
  );
}

// Role-specific dashboard skeletons
export function IssuerDashboardSkeleton() {
  return (
    <>
      <StatsGridSkeleton columns={4} />
      <ActivityListSkeleton items={3} />
    </>
  );
}

export function HolderDashboardSkeleton() {
  return (
    <>
      <ProgressBarsSkeleton bars={3} />
      <DualColumnSkeleton />
    </>
  );
}

export function VerifierDashboardSkeleton() {
  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <Paper withBorder radius="md" p="md">
          <Skeleton height={24} width="40%" mb="md" />

          <Stack gap="md">
            <Grid>
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Grid.Col key={i} span={6}>
                    <Card withBorder p="sm">
                      <Group wrap="nowrap">
                        <Skeleton height={40} circle />
                        <div style={{ flex: 1 }}>
                          <Skeleton height={10} width="80%" mb="xs" />
                          <Skeleton height={24} width="40%" />
                        </div>
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
            </Grid>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="md">
            <Skeleton height={24} width="40%" />
            <Skeleton height={36} width={100} />
          </Group>

          <Stack>
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} withBorder p="sm">
                  <Skeleton height={18} width="60%" mb="xs" />
                  <Group justify="space-between">
                    <Skeleton height={12} width="40%" />
                    <Skeleton height={30} width={100} />
                  </Group>
                </Card>
              ))}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md" mb="xl">
        <Skeleton height={24} width="30%" mb="md" />
        <Card withBorder p="md">
          <Skeleton height={16} width="80%" mb="md" />
          <Skeleton height={40} />
        </Card>
      </Paper>
    </>
  );
}

// Main dashboard skeleton that adapts based on user role
export function DashboardSkeleton({ userRole }: DashboardSkeletonProps) {
  if (!userRole) return null;

  return (
    <Container size="xl" py="xl">
      <WelcomeCardSkeleton />
      <QuickActionsSkeleton columns={userRole === 'verifier' ? 3 : 2} />

      {userRole === 'issuer' && <IssuerDashboardSkeleton />}
      {userRole === 'holder' && <HolderDashboardSkeleton />}
      {userRole === 'verifier' && <VerifierDashboardSkeleton />}
    </Container>
  );
}
