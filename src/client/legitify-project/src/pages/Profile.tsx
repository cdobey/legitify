import { useMyIssuersQuery } from '@/api/issuers/issuer.queries';
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
  useAccessibleCredentialsQuery,
  useAccessRequestsQuery,
  useLedgerRecordsQuery,
  useMyCredentialsQuery,
} from '../api/credentials/credential.queries';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  // Queries based on user role
  const { data: userCredentials } = useMyCredentialsQuery({ enabled: user?.role === 'holder' });
  const { data: accessRequests } = useAccessRequestsQuery({ enabled: user?.role === 'holder' });
  const { data: ledgerRecords } = useLedgerRecordsQuery({
    enabled: user?.role === 'issuer',
  });
  const { data: issuers } = useMyIssuersQuery({
    enabled: user?.role === 'issuer',
  });
  const { data: accessibleCredentials } = useAccessibleCredentialsQuery({
    enabled: user?.role === 'verifier',
  });

  // Format date for display
  const formatDate = (dateString?: string | null) => {
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
      case 'holder':
        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Your Credentials"
              value={(userCredentials?.length || 0).toString()}
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

      case 'issuer':
        const credentialCount = ledgerRecords?.length || 0;
        const latestRecord = ledgerRecords?.[0];
        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Credentials Issued"
              value={credentialCount.toString()}
              icon={<IconCertificate size={24} />}
              color="blue"
            />
            <StatCard
              title="Issuer ID"
              value={issuers?.[0]?.id ? issuers[0].id.substring(0, 8) + '...' : 'N/A'}
              icon={<IconBadge size={24} />}
              color="blue"
            />
            <StatCard
              title="Last Activity"
              value={credentialCount > 0 ? formatDate(latestRecord?.ledgerTimestamp) : 'N/A'}
              icon={<IconCalendar size={24} />}
              color="teal"
              isDate
            />
          </SimpleGrid>
        );

      case 'verifier':
        const accessibleCredentialsCount = accessibleCredentials?.length || 0;
        const uniqueHolders = new Set(
          accessibleCredentials?.map(credential => credential.holder?.email) || [],
        ).size;

        return (
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <StatCard
              title="Holders"
              value={uniqueHolders.toString()}
              icon={<IconUser size={24} />}
              color="indigo"
            />
            <StatCard
              title="Accessible Credentials"
              value={accessibleCredentialsCount.toString()}
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
          {user.role === 'holder' && (
            <Tabs.Tab value="credentials" leftSection={<IconCertificate size={16} />}>
              My Credentials
            </Tabs.Tab>
          )}
          {user.role === 'issuer' && (
            <Tabs.Tab value="issued" leftSection={<IconCertificate size={16} />}>
              Issued Credentials
            </Tabs.Tab>
          )}
          {user.role === 'verifier' && (
            <Tabs.Tab value="accessible" leftSection={<IconCertificate size={16} />}>
              Accessible Credentials
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

            {user.role === 'issuer' && issuers?.[0] && (
              <>
                <Title order={5} mt="xl" mb="md">
                  Issuer Information
                </Title>
                <Card withBorder p="md">
                  <Group align="flex-start">
                    {issuers[0].logoUrl && (
                      <Avatar
                        src={issuers[0].logoUrl}
                        alt={issuers[0].name}
                        size={100}
                        radius="md"
                      />
                    )}
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <ProfileDetailItem label="Issuer Name" value={issuers[0].name} />
                      <ProfileDetailItem label="Short Name" value={issuers[0].shorthand} />
                      <ProfileDetailItem label="Issuer ID" value={issuers[0].id} color="blue" />
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

        {user.role === 'holder' && (
          <Tabs.Panel value="credentials">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                My Credentials
              </Title>
              {userCredentials && userCredentials.length > 0 ? (
                <Stack>
                  {userCredentials.map(credential => (
                    <Card key={credential.docId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>{credential.title}</Title>
                          <Text size="sm">
                            Issuer: {credential.issuerInfo?.name || credential.issuer}
                          </Text>
                          <Text size="sm">Type: {credential.type}</Text>
                          <Text size="sm">
                            Issue Date: {formatDate(credential.ledgerTimestamp)}
                          </Text>
                          <Text size="sm">Credential ID: {credential.docId.slice(0, 10)}...</Text>
                          {credential.domain && <Text size="sm">Domain: {credential.domain}</Text>}
                        </div>
                        <Group>
                          {credential.verified && (
                            <Badge color="green" size="lg">
                              Verified
                            </Badge>
                          )}
                          <Badge
                            color={credential.status === 'accepted' ? 'blue' : 'yellow'}
                            size="lg"
                          >
                            {credential.status.charAt(0).toUpperCase() + credential.status.slice(1)}
                          </Badge>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You don't have any credentials yet.</Text>
              )}
            </Paper>
          </Tabs.Panel>
        )}

        {user.role === 'issuer' && (
          <Tabs.Panel value="issued">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                Issued Credentials
              </Title>
              {ledgerRecords && ledgerRecords.length > 0 ? (
                <Stack>
                  {ledgerRecords.map(record => (
                    <Card key={record.docId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>{record.title}</Title>
                          <Text size="sm">Holder: {record.holderEmail}</Text>
                          <Text size="sm">Type: {record.type}</Text>
                          <Text size="sm">Issue Date: {formatDate(record.ledgerTimestamp)}</Text>
                          <Text size="sm">Credential ID: {record.docId.slice(0, 10)}...</Text>
                          {record.domain && <Text size="sm">Domain: {record.domain}</Text>}
                        </div>
                        <Badge
                          color={record.accepted ? 'green' : record.denied ? 'red' : 'blue'}
                          size="lg"
                        >
                          {record.accepted ? 'Accepted' : record.denied ? 'Denied' : 'Issued'}
                        </Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You haven't issued any credentials yet.</Text>
              )}
            </Paper>
          </Tabs.Panel>
        )}

        {user.role === 'verifier' && (
          <Tabs.Panel value="accessible">
            <Paper shadow="sm" p="xl" withBorder radius="md">
              <Title order={4} mb="lg">
                Accessible Credentials
              </Title>
              {accessibleCredentials && accessibleCredentials.length > 0 ? (
                <Stack>
                  {accessibleCredentials.map(credential => (
                    <Card key={credential.requestId} withBorder className="accent-card">
                      <Group align="flex-start" justify="space-between">
                        <div>
                          <Title order={5}>{credential.title || 'Credential'}</Title>
                          <Text size="sm">
                            Holder: {credential.holder.name || credential.holder.email}
                          </Text>
                          <Text size="sm">Type: {credential.type || 'Not specified'}</Text>
                          <Text size="sm">Issuer: {credential.issuer}</Text>
                          <Text size="sm">
                            Access Granted: {formatDate(credential.dateGranted)}
                          </Text>
                        </div>
                        <Group>
                          <Badge color="indigo" size="lg">
                            Accessible
                          </Badge>
                          <Badge
                            color={credential.status === 'granted' ? 'green' : 'yellow'}
                            size="lg"
                          >
                            {credential.status.charAt(0).toUpperCase() + credential.status.slice(1)}
                          </Badge>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text>You don't have access to any credentials yet.</Text>
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
