import { useMyUniversitiesQuery } from '@/api/universities/university.queries';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBadge,
  IconBuilding,
  IconCalendar,
  IconCertificate,
  IconEdit,
  IconHistory,
  IconInfoCircle,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAccessibleDegreesQuery,
  useAccessRequestsQuery,
  useLedgerRecordsQuery,
  useMyDegreesQuery,
} from '../api/degrees/degree.queries';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  // Queries based on user role
  const { data: userDegrees } = useMyDegreesQuery({ enabled: user?.role === 'individual' });
  const { data: accessRequests } = useAccessRequestsQuery({ enabled: user?.role === 'individual' });
  const { data: ledgerRecords } = useLedgerRecordsQuery({
    enabled: user?.role === 'university',
  });
  const { data: universities } = useMyUniversitiesQuery({
    enabled: user?.role === 'university',
  });
  const { data: accessibleDegrees } = useAccessibleDegreesQuery({
    enabled: user?.role === 'employer',
  });

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Paper shadow="sm" p="xl" withBorder radius="md">
          <Title order={3} mb="md">
            Not Authenticated
          </Title>
          <Text>You need to be logged in to view your profile.</Text>
          <Button component={Link} to="/login" mt="md">
            Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Profile header component
  const ProfileHeader = () => (
    <Paper shadow="sm" p="xl" withBorder radius="md" mb="lg">
      <Group wrap="nowrap" align="start">
        <Avatar
          size={120}
          radius={120}
          src={user.profilePictureUrl}
          color="primaryBlue"
          style={{
            border: isDarkMode
              ? '4px solid rgba(60, 106, 195, 0.3)'
              : '4px solid rgba(60, 106, 195, 0.2)',
            boxShadow: isDarkMode
              ? '0 8px 20px rgba(0, 0, 0, 0.3)'
              : '0 8px 20px rgba(60, 106, 195, 0.2)',
          }}
        >
          {!user.profilePictureUrl && user.username.charAt(0).toUpperCase()}
        </Avatar>

        <Stack gap="xs" style={{ flex: 1 }}>
          <Group align="center" justify="space-between">
            <div>
              <Title order={2} style={{ marginBottom: 4 }}>
                {user.username}
              </Title>
              <Text size="lg" c="dimmed">
                {user.email}
              </Text>
            </div>
            <Button
              component={Link}
              to="/settings"
              variant="light"
              leftSection={<IconEdit size={16} />}
            >
              Edit Profile
            </Button>
          </Group>

          <Group mt="md" gap="md">
            <Badge color="primaryBlue" size="lg" variant="filled" radius="sm">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            <Badge color="teal" size="lg" variant="light" radius="sm">
              {user.orgName}
            </Badge>
            {user.twoFactorEnabled && (
              <Badge color="green" size="lg" variant="light" radius="sm">
                2FA Enabled
              </Badge>
            )}
          </Group>

          <Group mt="md">
            <Text size="sm" c="dimmed">
              <IconCalendar size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Member since {formatDate(user.createdAt)}
            </Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );

  // Get role-specific stats for the Overview tab
  const RoleStats = () => {
    switch (user.role) {
      case 'individual':
        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Your Degrees"
              value={(userDegrees?.length || 0).toString()}
              icon={<IconCertificate size={24} />}
              color="blue"
            />
            <StatCard
              title="Access Requests"
              value={(accessRequests?.length || 0).toString()}
              icon={<IconHistory size={24} />}
              color="violet"
            />
            <StatCard
              title="Pending Requests"
              value={(
                accessRequests?.filter(req => req.status === 'pending').length || 0
              ).toString()}
              icon={<IconHistory size={24} />}
              color="orange"
            />
          </SimpleGrid>
        );

      case 'university':
        const degreeCount = ledgerRecords?.length || 0;
        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Degrees Issued"
              value={degreeCount.toString()}
              icon={<IconCertificate size={24} />}
              color="blue"
            />
            <StatCard
              title="University ID"
              value={universities?.[0]?.id ? universities[0].id.substring(0, 8) + '...' : 'N/A'}
              icon={<IconBadge size={24} />}
              color="blue"
            />
            <StatCard
              title="Last Activity"
              value={degreeCount > 0 ? formatDate(ledgerRecords?.[0]?.issuedAt) : 'N/A'}
              icon={<IconCalendar size={24} />}
              color="teal"
              isDate
            />
          </SimpleGrid>
        );

      case 'employer':
        const accessibleDegreesCount = accessibleDegrees?.length || 0;
        const uniqueIndividuals = new Set(
          accessibleDegrees?.map(degree => degree.owner?.email) || [],
        ).size;

        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Individuals"
              value={uniqueIndividuals.toString()}
              icon={<IconUser size={24} />}
              color="indigo"
            />
            <StatCard
              title="Accessible Degrees"
              value={accessibleDegreesCount.toString()}
              icon={<IconCertificate size={24} />}
              color="blue"
            />
            <StatCard
              title="Organization"
              value={user.orgName}
              icon={<IconBuilding size={24} />}
              color="teal"
            />
          </SimpleGrid>
        );

      default:
        return null;
    }
  };

  return (
    <Container size="lg" py="xl">
      <ProfileHeader />

      <Tabs value={activeTab} onChange={setActiveTab} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="profile" leftSection={<IconUserCircle size={16} />}>
            Profile Details
          </Tabs.Tab>
          {user.role === 'individual' && (
            <Tabs.Tab value="degrees" leftSection={<IconCertificate size={16} />}>
              My Degrees
            </Tabs.Tab>
          )}
          {user.role === 'university' && (
            <Tabs.Tab value="issued" leftSection={<IconCertificate size={16} />}>
              Issued Degrees
            </Tabs.Tab>
          )}
          {user.role === 'employer' && (
            <Tabs.Tab value="accessible" leftSection={<IconCertificate size={16} />}>
              Accessible Degrees
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="overview">
          <Paper shadow="sm" p="xl" withBorder radius="md">
            <Title order={4} mb="lg">
              Account Overview
            </Title>
            <RoleStats />

            <Divider my="xl" />

            <Title order={4} mb="lg">
              Account Information
            </Title>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <ProfileDetailItem label="Username" value={user.username} />
              <ProfileDetailItem label="Email" value={user.email} />
              <ProfileDetailItem label="Role" value={user.role} capitalize />
              <ProfileDetailItem label="Organization" value={user.orgName} />
              <ProfileDetailItem label="Account Created" value={formatDate(user.createdAt)} />
              <ProfileDetailItem
                label="Two-Factor Authentication"
                value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                color={user.twoFactorEnabled ? 'green' : 'gray'}
              />
            </SimpleGrid>

            <Group justify="flex-end" mt="xl">
              <Button component={Link} to="/settings" leftSection={<IconEdit size={16} />}>
                Manage Account Settings
              </Button>
            </Group>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="profile">
          <Paper shadow="sm" p="xl" withBorder radius="md">
            <Title order={4} mb="lg">
              Profile Details
            </Title>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Stack>
                <Title order={5}>Account Information</Title>
                <Card withBorder p="md">
                  <Stack gap="md">
                    <ProfileDetailItem label="Username" value={user.username} />
                    <ProfileDetailItem label="Email" value={user.email} />
                    <ProfileDetailItem label="Role" value={user.role} capitalize />
                    <ProfileDetailItem label="Organization" value={user.orgName} />
                  </Stack>
                </Card>
              </Stack>

              <Stack>
                <Title order={5}>Security & Settings</Title>
                <Card withBorder p="md">
                  <Stack gap="md">
                    <ProfileDetailItem
                      label="Two-Factor Authentication"
                      value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      color={user.twoFactorEnabled ? 'green' : 'gray'}
                    />
                    <ProfileDetailItem label="Account Created" value={formatDate(user.createdAt)} />
                    <ProfileDetailItem label="Last Updated" value={formatDate(user.updatedAt)} />
                  </Stack>
                </Card>
              </Stack>
            </SimpleGrid>

            {user.role === 'university' && universities?.[0] && (
              <>
                <Title order={5} mt="xl" mb="md">
                  University Information
                </Title>
                <Card withBorder p="md">
                  <Group align="flex-start">
                    {universities[0].logoUrl && (
                      <Avatar
                        src={universities[0].logoUrl}
                        alt={universities[0].displayName}
                        size={100}
                        radius="md"
                      />
                    )}
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <ProfileDetailItem
                        label="University Name"
                        value={universities[0].displayName}
                      />
                      <ProfileDetailItem label="Short Name" value={universities[0].name} />
                      <ProfileDetailItem
                        label="University ID"
                        value={universities[0].id}
                        color="blue"
                      />
                    </Stack>
                  </Group>
                </Card>
              </>
            )}

            <Group justify="flex-end" mt="xl">
              <Button component={Link} to="/settings" leftSection={<IconEdit size={16} />}>
                Edit Profile
              </Button>
            </Group>
          </Paper>
        </Tabs.Panel>

        {user.role === 'individual' && (
          <Tabs.Panel value="degrees">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                My Degrees
              </Title>
              {userDegrees && userDegrees.length > 0 ? (
                <Stack>
                  {userDegrees.map(degree => (
                    <Card key={degree.docId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>{degree.degreeTitle}</Title>
                          <Text size="sm">Issued by: {degree.issuer}</Text>
                          <Text size="sm">Date: {formatDate(degree.issueDate)}</Text>
                          <Text size="sm">Degree ID: {degree.docId.slice(0, 10)}...</Text>
                        </div>
                        <Badge color="green" size="lg">
                          Verified
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You don't have any degrees yet.</Text>
              )}
            </Paper>
          </Tabs.Panel>
        )}

        {user.role === 'university' && (
          <Tabs.Panel value="issued">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                Issued Degrees
              </Title>
              {ledgerRecords && ledgerRecords.length > 0 ? (
                <Stack>
                  {ledgerRecords.map(record => (
                    <Card key={record.docId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>{record.degreeTitle}</Title>
                          <Text size="sm">Recipient: {record.owner}</Text>
                          <Text size="sm">Date: {formatDate(record.issuedAt)}</Text>
                          <Text size="sm">Degree ID: {record.docId.slice(0, 10)}...</Text>
                        </div>
                        <Badge color="blue" size="lg">
                          Issued
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You haven't issued any degrees yet.</Text>
              )}
            </Paper>
          </Tabs.Panel>
        )}

        {user.role === 'employer' && (
          <Tabs.Panel value="accessible">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                Accessible Degrees
              </Title>
              {accessibleDegrees && accessibleDegrees.length > 0 ? (
                <Stack>
                  {accessibleDegrees.map(degree => (
                    <Card key={degree.docId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>Degree Document</Title>
                          <Text size="sm">Holder: {degree.owner.name || degree.owner.email}</Text>
                          <Text size="sm">Issuer: {degree.issuer}</Text>
                          <Text size="sm">Date Granted: {formatDate(degree.dateGranted)}</Text>
                        </div>
                        <Badge color="indigo" size="lg">
                          Accessible
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You don't have access to any degrees yet.</Text>
              )}
            </Paper>
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
}

// Helper component for profile detail items
interface ProfileDetailItemProps {
  label: string;
  value: string;
  capitalize?: boolean;
  color?: string;
}

function ProfileDetailItem({ label, value, capitalize, color }: ProfileDetailItemProps) {
  return (
    <div>
      <Text size="sm" fw={500} c="dimmed">
        {label}
      </Text>
      <Text
        size="md"
        c={color}
        style={{
          textTransform: capitalize ? 'capitalize' : 'none',
        }}
      >
        {value}
      </Text>
    </div>
  );
}

// Helper component for stats cards
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  isDate?: boolean;
}

function StatCard({ title, value, icon, color, isDate }: StatCardProps) {
  return (
    <Card withBorder p="md" radius="md" className="accent-top-card">
      <Group align="flex-start" wrap="nowrap">
        <div
          style={{
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `var(--mantine-color-${color}-light)`,
            color: `var(--mantine-color-${color}-filled)`,
          }}
        >
          {icon}
        </div>
        <Stack gap={0} style={{ flex: 1 }}>
          <Text size="lg" fw={700} style={{ wordBreak: isDate ? 'break-word' : 'normal' }}>
            {value}
          </Text>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
