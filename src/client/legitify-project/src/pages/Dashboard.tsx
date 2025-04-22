import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconCertificate,
  IconCheck,
  IconClock,
  IconEye,
  IconFileCheck,
  IconFiles,
  IconInbox,
  IconSchool,
  IconSearch,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { AccessRequest } from '../api/credentials/credential.models';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Dashboard() {
  const { user } = useAuth();
  const theme = useMantineTheme();

  // Main dashboard data - this is now more self-contained
  const { data, isLoading, error, refetch } = useDashboardData();

  // Use data directly from the dashboard query
  const myCredentials = data?.myCredentials || [];
  const accessibleCredentials = data?.accessibleCredentials || [];
  const pendingRequests =
    data?.accessRequests?.filter((req: AccessRequest) => req.status === 'pending') || [];

  if (!user) {
    return (
      <Container>
        <Alert color="blue">Please log in to access your dashboard.</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton userRole={user?.role as 'issuer' | 'holder' | 'verifier'} />;
  }

  if (error) {
    return (
      <Container>
        <Alert color="red">{(error as Error).message}</Alert>
      </Container>
    );
  }

  const renderWelcomeCard = () => (
    <Card
      shadow="sm"
      p="lg"
      radius="md"
      withBorder
      mb="xl"
      className="accent-card highlight-on-hover"
    >
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3} fw={500}>
            Welcome back, {user.username}!
          </Title>
          <Text c="dimmed" size="sm">
            {user.role === 'issuer'
              ? 'Manage and issue credentials'
              : user.role === 'holder'
              ? 'Manage your academic credentials'
              : 'Verify and access academic credentials'}
          </Text>
        </div>
        <ThemeIcon size={50} radius="md" className="accent-theme-icon">
          {user.role === 'issuer' ? (
            <IconSchool size={30} />
          ) : user.role === 'holder' ? (
            <IconFiles size={30} />
          ) : (
            <IconSearch size={30} />
          )}
        </ThemeIcon>
      </Group>
    </Card>
  );

  const renderQuickActions = () => {
    const actions =
      user.role === 'issuer'
        ? [
            {
              title: 'Issue New Credential',
              icon: <IconCertificate size={22} />,
              color: theme.colors.primaryBlue?.[5] || theme.colors.blue[5],
              link: '/credential/issue',
              description: 'Issue a new credential to a holder',
            },
            {
              title: 'View All Records',
              icon: <IconEye size={22} />,
              color: theme.colors.accentTeal?.[5] || theme.colors.teal[5],
              link: '/credential/all-records',
              description: 'View all records on the blockchain',
            },
          ]
        : user.role === 'holder'
        ? [
            {
              title: 'Manage Credentials',
              icon: <IconFiles size={22} />,
              color: theme.colors.primaryBlue?.[5] || theme.colors.blue[5],
              link: '/credential/manage',
              description: 'View and manage your credentials',
            },
            {
              title: 'Access Requests',
              icon: <IconInbox size={22} />,
              color: theme.colors.accentOrange?.[5] || theme.colors.orange[5],
              link: '/credential/requests',
              description: `View access requests (${pendingRequests.length} pending)`,
              accent: pendingRequests.length > 0,
            },
          ]
        : [
            {
              title: 'Verify Credential',
              icon: <IconCheck size={22} />,
              color: theme.colors.primaryBlue?.[5] || theme.colors.blue[5],
              link: '/credential/verify',
              description: 'Verify a credential document',
            },
            {
              title: 'Search Users',
              icon: <IconUserPlus size={22} />,
              color: theme.colors.accentTeal?.[5] || theme.colors.teal[5],
              link: '/users/search',
              description: 'Find users and request access',
            },
            {
              title: 'Accessible Credentials',
              icon: <IconFileCheck size={22} />,
              color: theme.colors.accentOrange?.[5] || theme.colors.orange[5],
              link: '/credentials',
              description: 'View credentials you have access to',
            },
          ];

    return (
      <Paper withBorder radius="md" p="md" mb="xl">
        <Title order={4} mb="md">
          Quick Actions
        </Title>
        <SimpleGrid cols={{ base: 1, sm: actions.length }}>
          {actions.map((action, index) => (
            <Card
              key={index}
              component={Link}
              to={action.link}
              withBorder
              radius="md"
              p="sm"
              className={`hoverable-card ${action.accent ? 'highlight-card' : ''}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Group>
                <ThemeIcon size={44} radius="md" color={action.color} variant="light">
                  {action.icon}
                </ThemeIcon>
                <div>
                  <Text fw={500} size="lg">
                    {action.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {action.description}
                  </Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Paper>
    );
  };

  const renderIssuerDashboard = () => {
    const stats = [
      {
        title: 'Total Issued',
        value: data?.stats?.total || 0,
        icon: <IconCertificate />,
        color: theme.colors.blue[5],
      },
      {
        title: 'Accepted',
        value: data?.stats?.accepted || 0,
        icon: <IconCheck />,
        color: theme.colors.green[5],
      },
      {
        title: 'Pending',
        value: data?.stats?.pending || 0,
        icon: <IconClock />,
        color: theme.colors.yellow[5],
      },
      {
        title: 'Rejected',
        value: data?.stats?.rejected || 0,
        icon: <IconX />,
        color: theme.colors.red[5],
      },
    ];

    return (
      <>
        <Grid mb="xl">
          {stats.map((stat, index) => (
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={index}>
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    {stat.title}
                  </Text>
                  <ThemeIcon color={stat.color} variant="light" size={38} radius="md">
                    {stat.icon}
                  </ThemeIcon>
                </Group>
                <Text fw={700} size="xl" mt="sm">
                  {stat.value}
                </Text>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>

        <Paper withBorder radius="md" p="md" mb="xl">
          <Group justify="space-between" mb="md">
            <Title order={4}>Recent Activity</Title>
            <Button variant="light" size="sm" component={Link} to="/credential/issue">
              Issue New Credential
            </Button>
          </Group>

          {data?.recentIssued && data.recentIssued.length > 0 ? (
            <Stack>
              {data.recentIssued.map((credential, index) => (
                <Card key={index} withBorder p="sm">
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>{credential.recipientName || credential.issuedTo}</Text>
                      <Text size="xs" c="dimmed">
                        Document ID: {credential.docId}
                      </Text>
                    </div>
                    <Badge
                      color={
                        credential.status === 'accepted'
                          ? 'green'
                          : credential.status === 'denied'
                          ? 'red'
                          : 'blue'
                      }
                    >
                      {credential.status}
                    </Badge>
                  </Group>
                  <Text size="xs" mt="xs">
                    Issued on: {new Date(credential.issueDate).toLocaleDateString()}
                  </Text>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" p="lg">
              No recently issued credentials found. Try issuing a credential first.
            </Text>
          )}
        </Paper>
      </>
    );
  };

  const renderHolderDashboard = () => {
    // Calculate percentages for the progress bars
    const total = data?.stats?.total || 0;
    const acceptedPercent =
      total > 0 ? Math.round(((data?.stats?.accepted || 0) * 100) / total) : 0;
    const pendingPercent = total > 0 ? Math.round(((data?.stats?.pending || 0) * 100) / total) : 0;
    const rejectedPercent =
      total > 0 ? Math.round(((data?.stats?.rejected || 0) * 100) / total) : 0;

    return (
      <>
        <Paper withBorder radius="md" p="md" mb="xl">
          <Title order={4} mb="md">
            Credential Status
          </Title>
          <Box mb="md">
            <Group justify="space-between" mb={5}>
              <Text size="sm">Accepted</Text>
              <Text size="sm" c="dimmed">
                {data?.stats?.accepted || 0} of {total}
              </Text>
            </Group>
            <Progress value={acceptedPercent} color="green" size="lg" radius="xl" />
          </Box>
          <Box mb="md">
            <Group justify="space-between" mb={5}>
              <Text size="sm">Pending</Text>
              <Text size="sm" c="dimmed">
                {data?.stats?.pending || 0} of {total}
              </Text>
            </Group>
            <Progress value={pendingPercent} color="yellow" size="lg" radius="xl" />
          </Box>
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="sm">Rejected</Text>
              <Text size="sm" c="dimmed">
                {data?.stats?.rejected || 0} of {total}
              </Text>
            </Group>
            <Progress value={rejectedPercent} color="red" size="lg" radius="xl" />
          </Box>
        </Paper>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Your Credentials</Title>
              <Button variant="light" size="sm" component={Link} to="/credential/manage">
                View All
              </Button>
            </Group>

            {myCredentials && myCredentials.length > 0 ? (
              <Stack>
                {myCredentials.slice(0, 3).map((credential: any, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>From: {credential.issuer}</Text>
                        <Text size="xs" c="dimmed">
                          ID: {credential.docId}
                        </Text>
                      </div>
                      <Badge
                        color={
                          credential.status === 'accepted'
                            ? 'green'
                            : credential.status === 'denied'
                            ? 'red'
                            : 'blue'
                        }
                      >
                        {credential.status}
                      </Badge>
                    </Group>
                  </Card>
                ))}
                {myCredentials.length > 3 && (
                  <Text ta="center" size="sm" c="dimmed">
                    + {myCredentials.length - 3} more credentials
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No credentials found
              </Text>
            )}
          </Paper>

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Access Requests</Title>
              <Button variant="light" size="sm" component={Link} to="/credential/requests">
                View All
              </Button>
            </Group>

            {pendingRequests.length > 0 ? (
              <Stack>
                {pendingRequests.slice(0, 3).map((request: AccessRequest, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Text fw={500}>From: {request.verifierName || 'Unknown Verifier'}</Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Document:
                        {request.docId ? request.docId.substring(0, 8) + '...' : 'ID unavailable'}
                      </Text>
                      <Badge color="yellow">Pending</Badge>
                    </Group>
                    <Text size="xs" mt="xs">
                      Requested on:
                      {request.requestDate
                        ? new Date(request.requestDate).toLocaleDateString()
                        : 'Date unavailable'}
                    </Text>
                  </Card>
                ))}
                {pendingRequests.length > 3 && (
                  <Text ta="center" size="sm" c="dimmed">
                    + {pendingRequests.length - 3} more requests
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No pending access requests
              </Text>
            )}
          </Paper>
        </SimpleGrid>
      </>
    );
  };

  const renderVerifierDashboard = () => {
    // Calculate stats from accessible credentials
    const statsFromAccessibleCredentials = {
      totalAccessible: accessibleCredentials.length,
      uniqueHolders: new Set(accessibleCredentials.map(credential => credential.holder.email)).size,
      uniqueIssuers: new Set(accessibleCredentials.map(credential => credential.issuer)).size,
      recentlyGranted: accessibleCredentials.filter(credential => {
        if (!credential.dateGranted) return false;
        const grantDate = new Date(credential.dateGranted);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return grantDate > thirtyDaysAgo;
      }).length,
    };

    return (
      <>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <Paper withBorder radius="md" p="md">
            <Title order={4} mb="md">
              Credentials Overview
            </Title>

            <Stack gap="md">
              <Grid>
                {[
                  {
                    title: 'Accessible Credentials',
                    value: statsFromAccessibleCredentials.totalAccessible,
                    icon: <IconFileCheck size={22} />,
                    color: 'blue',
                  },
                  {
                    title: 'From Issuers',
                    value: statsFromAccessibleCredentials.uniqueIssuers,
                    icon: <IconSchool size={22} />,
                    color: 'green',
                  },
                  {
                    title: 'Unique Holders',
                    value: statsFromAccessibleCredentials.uniqueHolders,
                    icon: <IconUserPlus size={22} />,
                    color: 'teal',
                  },
                  {
                    title: 'Recently Granted',
                    value: statsFromAccessibleCredentials.recentlyGranted,
                    icon: <IconClock size={22} />,
                    color: 'violet',
                  },
                ].map((stat, index) => (
                  <Grid.Col key={index} span={6}>
                    <Card withBorder p="sm">
                      <Group wrap="nowrap">
                        <ThemeIcon color={stat.color} variant="light" size={40} radius="md">
                          {stat.icon}
                        </ThemeIcon>
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase">
                            {stat.title}
                          </Text>
                          <Text fw={700} size="xl">
                            {stat.value}
                          </Text>
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
              <Title order={4}>Accessible Credentials</Title>
              <Button variant="light" size="sm" component={Link} to="/credentials">
                View All
              </Button>
            </Group>

            {accessibleCredentials && accessibleCredentials.length > 0 ? (
              <Stack>
                {accessibleCredentials.slice(0, 2).map((credential: any, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Text fw={500}>Owner: {credential.holder?.name || 'Unknown'}</Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Issued by: {credential.issuer}
                      </Text>
                      <Button
                        variant="subtle"
                        size="sm"
                        component={Link}
                        to={`/credential/view/${credential.credentialId}`}
                        rightSection={<IconArrowUpRight size={rem(16)} />}
                      >
                        View
                      </Button>
                    </Group>
                  </Card>
                ))}
                {accessibleCredentials.length > 3 && (
                  <Text ta="center" size="sm" c="dimmed">
                    + {accessibleCredentials.length - 2} more accessible credentials
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No accessible credentials found
              </Text>
            )}
          </Paper>
        </SimpleGrid>

        <Paper withBorder radius="md" p="md" mb="xl">
          <Title order={4} mb="md">
            Quick Search
          </Title>
          <Card withBorder p="md">
            <Text mb="md">Search for holders to request access to their credentials:</Text>
            <Button
              fullWidth
              leftSection={<IconSearch size={20} />}
              component={Link}
              to="/users/search"
            >
              Search Users
            </Button>
          </Card>
        </Paper>
      </>
    );
  };

  return (
    <Container size="xl" py="xl">
      {renderWelcomeCard()}
      {renderQuickActions()}

      {user.role === 'issuer' && renderIssuerDashboard()}
      {user.role === 'holder' && renderHolderDashboard()}
      {user.role === 'verifier' && renderVerifierDashboard()}
    </Container>
  );
}
