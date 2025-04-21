import { useViewCredentialQuery } from '@/api/credentials/credential.queries';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  rem,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBuilding,
  IconCalendar,
  IconCertificate,
  IconCheck,
  IconFileText,
  IconGrain,
  IconInfoCircle,
  IconUserCircle,
} from '@tabler/icons-react';
import { useParams } from 'react-router-dom';

export default function ViewCredential() {
  const { docId } = useParams<{ docId: string }>();
  const { isDarkMode } = useTheme();
  const theme = useMantineTheme();

  const {
    data: credential,
    isLoading,
    error,
  } = useViewCredentialQuery(docId!, { enabled: !!docId });

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <Paper shadow="md" p="lg" radius="md" withBorder>
          <Skeleton height={60} mb="lg" width="60%" />
          <Skeleton height={30} mb="md" width="40%" />
          <Divider my="lg" />
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Skeleton height={300} radius="md" />
            <Skeleton height={300} radius="md" />
          </SimpleGrid>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert
          icon={<IconAlertTriangle size="1.1rem" />}
          title="Error loading document"
          color="red"
          radius="md"
        >
          {(error as Error).message}
        </Alert>
      </Container>
    );
  }

  if (!credential) return null;

  const { verified, status } = credential;

  const getStatusBadge = () => {
    const colorMap = {
      accepted: {
        color: isDarkMode ? '#15e2b5' : 'green',
        bg: isDarkMode ? 'rgba(21, 226, 181, 0.15)' : undefined,
      },
      denied: {
        color: isDarkMode ? '#ff5c5c' : 'red',
        bg: isDarkMode ? 'rgba(255, 92, 92, 0.15)' : undefined,
      },
      issued: {
        color: isDarkMode ? '#2ca6d3' : 'blue',
        bg: isDarkMode ? 'rgba(44, 166, 211, 0.15)' : undefined,
      },
      default: {
        color: isDarkMode ? '#a6a7ab' : 'gray',
        bg: isDarkMode ? 'rgba(166, 167, 171, 0.15)' : undefined,
      },
    };

    switch (status) {
      case 'accepted':
        return (
          <Badge
            size="md"
            radius="md"
            color={colorMap.accepted.color}
            style={{ backgroundColor: colorMap.accepted.bg }}
          >
            Verified & Accepted
          </Badge>
        );
      case 'denied':
        return (
          <Badge
            size="md"
            radius="md"
            color={colorMap.denied.color}
            style={{ backgroundColor: colorMap.denied.bg }}
          >
            Rejected
          </Badge>
        );
      case 'issued':
        return (
          <Badge
            size="md"
            radius="md"
            color={colorMap.issued.color}
            style={{ backgroundColor: colorMap.issued.bg }}
          >
            Pending Acceptance
          </Badge>
        );
      default:
        return (
          <Badge
            size="md"
            radius="md"
            color={colorMap.default.color}
            style={{ backgroundColor: colorMap.default.bg }}
          >
            {status}
          </Badge>
        );
    }
  };

  const documentTitle = credential.title || 'Credential';
  const fieldOrDomain = credential.domain || 'Field not specified';
  const displayTitle = `${documentTitle}${fieldOrDomain ? ` in ${fieldOrDomain}` : ''}`;

  return (
    <Container size="lg" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="light"
              color={isDarkMode ? '#2ca6d3' : 'blue'}
            >
              <IconCertificate size={rem(24)} />
            </ThemeIcon>
            <div>
              <Title order={2}>{displayTitle}</Title>
              <Text c="dimmed" size="sm">
                {credential.issuer || 'Unknown Institution'}
              </Text>
            </div>
          </Group>
          <Group>
            {getStatusBadge()}
            {verified && (
              <Tooltip label="Document verified on blockchain">
                <Badge
                  size="md"
                  radius="md"
                  leftSection={<IconCheck size={16} />}
                  color={isDarkMode ? '#15e2b5' : 'teal'}
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(21, 226, 181, 0.15)' : undefined,
                  }}
                >
                  Blockchain Verified
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Group>

        <Divider size="sm" my="lg" />

        <Tabs defaultValue="document" variant="outline" radius="md">
          <Tabs.List mb="lg">
            <Tabs.Tab value="document" leftSection={<IconFileText size={18} />} fw={500}>
              Document
            </Tabs.Tab>
            <Tabs.Tab value="details" leftSection={<IconInfoCircle size={18} />} fw={500}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="verification" leftSection={<IconGrain size={18} />} fw={500}>
              Verification Info
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="document">
            <Card shadow="sm" radius="md" padding="xl" mb="md" withBorder>
              {credential.fileData ? (
                <Box py={5}>
                  <embed
                    src={`data:application/pdf;base64,${credential.fileData}`}
                    type="application/pdf"
                    width="100%"
                    height="600px"
                    style={{ borderRadius: '8px', border: `1px solid ${theme.colors.gray[3]}` }}
                  />
                </Box>
              ) : (
                <Alert color="yellow" radius="md" title="No Document Available">
                  The original document file is not available.
                </Alert>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="details">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Card shadow="sm" radius="md" padding="lg" withBorder>
                <Group mb="md">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="filled"
                    color={isDarkMode ? '#2ca6d3' : 'blue'}
                  >
                    <IconCertificate size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    Credential Information
                  </Text>
                </Group>
                <Divider mb="md" />
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={600}>Title:</Text>
                    <Text>{credential.title || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Type:</Text>
                    <Text>{credential.type || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Domain:</Text>
                    <Text>{credential.domain || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Achievement Date:</Text>
                    <Text>{credential.achievementDate || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Program Length:</Text>
                    <Text>{credential.programLength || 'Not specified'}</Text>
                  </Group>
                  {credential.attributes &&
                    Object.entries(credential.attributes).map(([key, value]) => (
                      <Group gap="xs" key={key}>
                        <Text fw={600}>{key}:</Text>
                        <Text>{value?.toString() || 'Not specified'}</Text>
                      </Group>
                    ))}
                </Stack>
              </Card>

              <Card shadow="sm" radius="md" padding="lg" withBorder>
                <Group mb="md">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="filled"
                    color={isDarkMode ? '#6741d9' : 'indigo'}
                  >
                    <IconBuilding size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    Issuing Organization
                  </Text>
                </Group>
                <Divider mb="md" />
                {credential.issuerInfo?.logoUrl && (
                  <Box mb="md" style={{ maxWidth: '200px', margin: '0 auto' }}>
                    <img
                      src={credential.issuerInfo.logoUrl}
                      alt={`${credential.issuerInfo.name} logo`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: theme.radius.sm,
                      }}
                    />
                  </Box>
                )}
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={600}>Organization Name:</Text>
                    <Text>{credential.issuerInfo?.name || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Shorthand:</Text>
                    <Text>{credential.issuer || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Organization ID:</Text>
                    <Text>{credential.issuerOrgId || 'Not specified'}</Text>
                  </Group>
                  {credential.issuerInfo?.description && (
                    <Group gap="xs" align="flex-start">
                      <Text fw={600}>Description:</Text>
                      <Text>{credential.issuerInfo.description}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>

              <Card shadow="sm" radius="md" padding="lg" withBorder>
                <Group mb="md">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="filled"
                    color={isDarkMode ? '#37b24d' : 'green'}
                  >
                    <IconUserCircle size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    Credential Holder
                  </Text>
                </Group>
                <Divider mb="md" />
                {credential.holder ? (
                  <Stack gap="sm">
                    <Group gap="xs">
                      <Text fw={600}>Name:</Text>
                      <Text>{credential.holder.name}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text fw={600}>Email:</Text>
                      <Text>
                        <Anchor href={`mailto:${credential.holder.email}`} target="_blank">
                          {credential.holder.email}
                        </Anchor>
                      </Text>
                    </Group>
                  </Stack>
                ) : (
                  <Text c="dimmed">Holder information not available</Text>
                )}
              </Card>

              <Card shadow="sm" radius="md" padding="lg" withBorder>
                <Group mb="md">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant="filled"
                    color={isDarkMode ? '#e8590c' : 'orange'}
                  >
                    <IconCalendar size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={700} size="lg">
                    Access Information
                  </Text>
                </Group>
                <Divider mb="md" />
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={600}>Status:</Text>
                    {getStatusBadge()}
                  </Group>
                  <Group gap="xs">
                    <Text fw={600}>Access Granted On:</Text>
                    <Text>{credential.accessGrantedOn || 'Not available'}</Text>
                  </Group>
                  {credential.blockchainInfo?.recordCreated && (
                    <Group gap="xs">
                      <Text fw={600}>Record Created:</Text>
                      <Text>{credential.blockchainInfo.recordCreated}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="verification">
            <Card shadow="sm" radius="md" padding="lg" withBorder>
              <Group mb="md">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="filled"
                  color={isDarkMode ? '#22b8cf' : 'cyan'}
                >
                  <IconGrain size={rem(20)} />
                </ThemeIcon>
                <Text fw={700} size="lg">
                  Blockchain Verification
                </Text>
              </Group>
              <Divider mb="md" />

              <Alert
                mb="lg"
                radius="md"
                title={verified ? 'Verification Successful' : 'Verification Failed'}
                color={
                  verified ? (isDarkMode ? '#15e2b5' : 'green') : isDarkMode ? '#ff5c5c' : 'red'
                }
                icon={verified ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
                styles={{
                  root: {
                    backgroundColor: verified
                      ? isDarkMode
                        ? 'rgba(21, 226, 181, 0.15)'
                        : undefined
                      : isDarkMode
                      ? 'rgba(255, 92, 92, 0.15)'
                      : undefined,
                  },
                }}
              >
                {verified
                  ? 'Document successfully verified against blockchain record'
                  : 'Document verification failed'}
              </Alert>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                <Card
                  p="md"
                  radius="md"
                  bg={isDarkMode ? theme.colors.dark[6] : theme.colors.gray[0]}
                >
                  <Stack gap="md">
                    <Group gap="xs">
                      <Text fw={600}>Document Hash:</Text>
                      <Text size="sm" ff="monospace">
                        {credential.verificationHash?.substring(0, 20)}
                        {credential.verificationHash && credential.verificationHash.length > 20
                          ? '...'
                          : ''}
                      </Text>
                    </Group>
                    {credential.blockchainInfo && (
                      <>
                        <Group gap="xs">
                          <Text fw={600}>Record Created:</Text>
                          <Text>{credential.blockchainInfo.recordCreated || 'Not available'}</Text>
                        </Group>
                        <Group gap="xs">
                          <Text fw={600}>Transaction ID:</Text>
                          <Text size="sm" ff="monospace">
                            {credential.blockchainInfo.txId?.substring(0, 20)}
                            {credential.blockchainInfo.txId &&
                            credential.blockchainInfo.txId.length > 20
                              ? '...'
                              : ''}
                          </Text>
                        </Group>
                        {credential.blockchainInfo.lastUpdated && (
                          <Group gap="xs">
                            <Text fw={600}>Last Updated:</Text>
                            <Text>{credential.blockchainInfo.lastUpdated}</Text>
                          </Group>
                        )}
                      </>
                    )}
                  </Stack>
                </Card>
              </SimpleGrid>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
