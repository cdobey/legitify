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
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AccessRequest } from '../api/degrees/degree.models';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';
export default function Dashboard() {
  const { user } = useAuth();
  const theme = useMantineTheme();

  // Main dashboard data - this is now more self-contained
  const { data, isLoading, error, refetch } = useDashboardData();

  // Force immediate data loading when dashboard is mounted
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  // Use data directly from the dashboard query
  const myDegrees = data?.myDegrees || [];
  const accessibleDegrees = data?.accessibleDegrees || [];
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
    return (
      <Container>
        <Text>Loading dashboard data...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert color="red">{(error as Error).message}</Alert>
      </Container>
    );
  }

  const renderWelcomeCard = () => (
    <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={3} fw={500}>
            Welcome back, {user.username}!
          </Title>
          <Text c="dimmed" size="sm">
            {user.role === 'university'
              ? 'Manage and issue credentials'
              : user.role === 'individual'
              ? 'Manage your academic credentials'
              : 'Verify and access academic credentials'}
          </Text>
        </div>
        <ThemeIcon size={50} radius="md" color="primaryBlue">
          {user.role === 'university' ? (
            <IconSchool size={30} />
          ) : user.role === 'individual' ? (
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
      user.role === 'university'
        ? [
            {
              title: 'Issue New Degree',
              icon: <IconCertificate size={22} />,
              color: theme.colors.primaryBlue[5],
              link: '/degree/issue',
              description: 'Issue a new credential to a student',
            },
            {
              title: 'View All Records',
              icon: <IconEye size={22} />,
              color: theme.colors.accentTeal[5],
              link: '/degree/all-records',
              description: 'View all records on the blockchain',
            },
          ]
        : user.role === 'individual'
        ? [
            {
              title: 'Manage Degrees',
              icon: <IconFiles size={22} />,
              color: theme.colors.primaryBlue[5],
              link: '/degree/manage',
              description: 'View and manage your credentials',
            },
            {
              title: 'Access Requests',
              icon: <IconInbox size={22} />,
              color: theme.colors.accentTeal[5],
              link: '/degree/requests',
              description: `View access requests (${pendingRequests.length} pending)`,
            },
          ]
        : [
            {
              title: 'Verify Degree',
              icon: <IconCheck size={22} />,
              color: theme.colors.primaryBlue[5],
              link: '/degree/verify',
              description: 'Verify a credential document',
            },
            {
              title: 'Search Users',
              icon: <IconUserPlus size={22} />,
              color: theme.colors.accentTeal[5],
              link: '/users/search',
              description: 'Find users and request access',
            },
            {
              title: 'Accessible Degrees',
              icon: <IconFileCheck size={22} />,
              color: theme.colors.accentAmber[5],
              link: '/degree/accessible',
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
              style={{
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                },
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

  const renderUniversityDashboard = () => {
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
            <Button variant="light" size="sm" component={Link} to="/degree/issue">
              Issue New Degree
            </Button>
          </Group>

          {data?.recentIssued && data.recentIssued.length > 0 ? (
            <Stack>
              {data.recentIssued.map((degree: any, index: number) => (
                <Card key={index} withBorder p="sm">
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Document ID: {degree.docId}</Text>
                      <Text size="xs" c="dimmed">
                        Issued to: {degree.issuedTo || 'Unknown'}
                      </Text>
                    </div>
                    <Badge
                      color={
                        degree.status === 'accepted'
                          ? 'green'
                          : degree.status === 'denied'
                          ? 'red'
                          : 'blue'
                      }
                    >
                      {degree.status}
                    </Badge>
                  </Group>
                  <Text size="xs" mt="xs">
                    Issued on: {new Date(degree.issueDate).toLocaleDateString()}
                  </Text>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" p="lg">
              No recently issued degrees found
            </Text>
          )}
        </Paper>
      </>
    );
  };

  const renderIndividualDashboard = () => {
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
            Degree Status
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
              <Title order={4}>Your Degrees</Title>
              <Button variant="light" size="sm" component={Link} to="/degree/manage">
                View All
              </Button>
            </Group>

            {myDegrees && myDegrees.length > 0 ? (
              <Stack>
                {myDegrees.slice(0, 3).map((degree: any, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>From: {degree.issuer}</Text>
                        <Text size="xs" c="dimmed">
                          ID: {degree.docId}
                        </Text>
                      </div>
                      <Badge
                        color={
                          degree.status === 'accepted'
                            ? 'green'
                            : degree.status === 'denied'
                            ? 'red'
                            : 'blue'
                        }
                      >
                        {degree.status}
                      </Badge>
                    </Group>
                  </Card>
                ))}
                {myDegrees.length > 3 && (
                  <Text ta="center" size="sm" c="dimmed">
                    + {myDegrees.length - 3} more degrees
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No degrees found
              </Text>
            )}
          </Paper>

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Access Requests</Title>
              <Button variant="light" size="sm" component={Link} to="/degree/requests">
                View All
              </Button>
            </Group>

            {pendingRequests.length > 0 ? (
              <Stack>
                {pendingRequests.slice(0, 3).map((request: AccessRequest, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Text fw={500}>From: {request.employerName}</Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Document: {request.docId.substring(0, 8)}...
                      </Text>
                      <Badge color="yellow">Pending</Badge>
                    </Group>
                    <Text size="xs" mt="xs">
                      Requested on: {new Date(request.requestDate).toLocaleDateString()}
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

  const renderEmployerDashboard = () => {
    return (
      <>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
          <Paper withBorder radius="md" p="md">
            <Title order={4} mb="md">
              Recent Verifications
            </Title>

            {data?.recentVerifications && data.recentVerifications.length > 0 ? (
              <Stack>
                {data.recentVerifications.map((verification: any, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{verification.email || 'Unknown User'}</Text>
                        <Text size="xs" c="dimmed">
                          Document: {verification.docId || 'N/A'}
                        </Text>
                      </div>
                      <Badge color={verification.result ? 'green' : 'red'}>
                        {verification.result ? 'Verified' : 'Failed'}
                      </Badge>
                    </Group>
                    <Text size="xs" mt="xs">
                      Verified on: {new Date(verification.date).toLocaleDateString()}
                    </Text>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No recent verifications
              </Text>
            )}
          </Paper>

          <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="md">
              <Title order={4}>Accessible Degrees</Title>
              <Button variant="light" size="sm" component={Link} to="/degree/accessible">
                View All
              </Button>
            </Group>

            {accessibleDegrees && accessibleDegrees.length > 0 ? (
              <Stack>
                {accessibleDegrees.slice(0, 3).map((degree: any, index: number) => (
                  <Card key={index} withBorder p="sm">
                    <Text fw={500}>Owner: {degree.owner?.name || 'Unknown'}</Text>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Issued by: {degree.issuer}
                      </Text>
                      <Button
                        variant="subtle"
                        size="sm"
                        component={Link}
                        to={`/degree/view/${degree.docId}`}
                        rightSection={<IconArrowUpRight size={rem(16)} />}
                      >
                        View
                      </Button>
                    </Group>
                  </Card>
                ))}
                {accessibleDegrees.length > 3 && (
                  <Text ta="center" size="sm" c="dimmed">
                    + {accessibleDegrees.length - 3} more accessible degrees
                  </Text>
                )}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" p="lg">
                No accessible degrees found
              </Text>
            )}
          </Paper>
        </SimpleGrid>

        <Paper withBorder radius="md" p="md" mb="xl">
          <Title order={4} mb="md">
            Quick Search
          </Title>
          <Card withBorder p="md">
            <Text mb="md">Search for individuals to request access to their credentials:</Text>
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

      {user.role === 'university' && renderUniversityDashboard()}
      {user.role === 'individual' && renderIndividualDashboard()}
      {user.role === 'employer' && renderEmployerDashboard()}
    </Container>
  );
}
