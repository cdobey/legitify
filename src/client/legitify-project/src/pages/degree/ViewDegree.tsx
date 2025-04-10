import { useViewDegreeQuery } from '@/api/degrees/degree.queries';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Alert,
  Badge,
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
  IconCalendar,
  IconCertificate,
  IconCheck,
  IconFileText,
  IconGrain,
  IconInfoCircle,
  IconSchool,
  IconUserCircle,
} from '@tabler/icons-react';
import { useParams } from 'react-router-dom';

export default function ViewDegree() {
  const { docId } = useParams<{ docId: string }>();
  const { isDarkMode } = useTheme();
  const theme = useMantineTheme();

  const { data: degree, isLoading, error } = useViewDegreeQuery(docId!, { enabled: !!docId });

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <Skeleton height={50} mb="md" />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Skeleton height={300} />
          <Skeleton height={300} />
        </SimpleGrid>
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
        >
          {(error as Error).message}
        </Alert>
      </Container>
    );
  }

  if (!degree) return null;

  const { verified, status } = degree;

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
          <Badge color={colorMap.accepted.color} style={{ backgroundColor: colorMap.accepted.bg }}>
            Verified & Accepted
          </Badge>
        );
      case 'denied':
        return (
          <Badge color={colorMap.denied.color} style={{ backgroundColor: colorMap.denied.bg }}>
            Rejected
          </Badge>
        );
      case 'issued':
        return (
          <Badge color={colorMap.issued.color} style={{ backgroundColor: colorMap.issued.bg }}>
            Pending Acceptance
          </Badge>
        );
      default:
        return (
          <Badge color={colorMap.default.color} style={{ backgroundColor: colorMap.default.bg }}>
            {status}
          </Badge>
        );
    }
  };

  const documentTitle = degree.degreeTitle || 'Academic Certificate';
  const fieldOfStudy = degree.fieldOfStudy || 'Field not specified';
  const displayTitle = `${documentTitle}${fieldOfStudy ? ` in ${fieldOfStudy}` : ''}`;

  return (
    <Container size="lg" py="xl">
      <Paper shadow="xs" p="md" mb="xl">
        <Group justify="space-between" mb={5}>
          <Group>
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconCertificate size={rem(20)} />
            </ThemeIcon>
            <div>
              <Title order={2}>{displayTitle}</Title>
              <Text c="dimmed" size="sm">
                {degree.issuer || 'Unknown Institution'}
              </Text>
            </div>
          </Group>
          <Group>
            {getStatusBadge()}
            {verified && (
              <Tooltip label="Document verified on blockchain">
                <Badge
                  leftSection={<IconCheck size={14} />}
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

        <Divider my="md" />

        <Tabs defaultValue="document">
          <Tabs.List mb="md">
            <Tabs.Tab value="document" leftSection={<IconFileText size={16} />}>
              Document
            </Tabs.Tab>
            <Tabs.Tab value="details" leftSection={<IconInfoCircle size={16} />}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="verification" leftSection={<IconGrain size={16} />}>
              Verification Info
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="document">
            <Card shadow="sm" padding="lg" mb="md">
              {degree.fileData ? (
                <embed
                  src={`data:application/pdf;base64,${degree.fileData}`}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                />
              ) : (
                <Alert color="yellow">The original document file is not available.</Alert>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="details">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Card shadow="sm" padding="lg">
                <Group mb="md">
                  <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                    <IconCertificate size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    Certificate Information
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text fw={500}>Degree Title:</Text>
                    <Text>{degree.degreeTitle || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={500}>Field of Study:</Text>
                    <Text>{degree.fieldOfStudy || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={500}>Graduation Date:</Text>
                    <Text>{degree.graduationDate || 'Not specified'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={500}>Honors:</Text>
                    <Text>{degree.honors || 'None'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text fw={500}>Program Duration:</Text>
                    <Text>{degree.programDuration || 'Not specified'}</Text>
                  </Group>
                  {degree.gpa && (
                    <Group gap="xs">
                      <Text fw={500}>GPA:</Text>
                      <Text>{degree.gpa}</Text>
                    </Group>
                  )}
                  {degree.studentId && (
                    <Group gap="xs">
                      <Text fw={500}>Student ID:</Text>
                      <Text>{degree.studentId}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg">
                <Group mb="md">
                  <ThemeIcon size="lg" radius="md" variant="light" color="indigo">
                    <IconSchool size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    Issuing Institution
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text fw={500}>Name:</Text>
                    <Text>{degree.issuer}</Text>
                  </Group>
                  {degree.universityInfo && (
                    <>
                      <Group gap="xs">
                        <Text fw={500}>Institution ID:</Text>
                        <Text>{degree.universityInfo.name}</Text>
                      </Group>
                      {degree.universityInfo.description && (
                        <Group gap="xs" align="flex-start">
                          <Text fw={500}>Description:</Text>
                          <Text>{degree.universityInfo.description}</Text>
                        </Group>
                      )}
                    </>
                  )}
                  <Group gap="xs">
                    <Text fw={500}>Issue Date:</Text>
                    <Text>{degree.issueDate || 'Not available'}</Text>
                  </Group>
                </Stack>
              </Card>

              <Card shadow="sm" padding="lg">
                <Group mb="md">
                  <ThemeIcon size="lg" radius="md" variant="light" color="green">
                    <IconUserCircle size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    Certificate Owner
                  </Text>
                </Group>
                {degree.owner ? (
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text fw={500}>Name:</Text>
                      <Text>{degree.owner.name}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text fw={500}>Email:</Text>
                      <Text>{degree.owner.email}</Text>
                    </Group>
                  </Stack>
                ) : (
                  <Text c="dimmed">Owner information not available</Text>
                )}
              </Card>

              <Card shadow="sm" padding="lg">
                <Group mb="md">
                  <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                    <IconCalendar size={rem(20)} />
                  </ThemeIcon>
                  <Text fw={600} size="lg">
                    Access Information
                  </Text>
                </Group>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text fw={500}>Status:</Text>
                    {getStatusBadge()}
                  </Group>
                  <Group gap="xs">
                    <Text fw={500}>Access Granted On:</Text>
                    <Text>{degree.accessGrantedOn || 'Not available'}</Text>
                  </Group>
                  {degree.additionalNotes && (
                    <Group gap="xs" align="flex-start">
                      <Text fw={500}>Additional Notes:</Text>
                      <Text>{degree.additionalNotes}</Text>
                    </Group>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="verification">
            <Card shadow="sm" padding="lg">
              <Group mb="md">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color={isDarkMode ? '#22b8cf' : 'cyan'}
                >
                  <IconGrain size={rem(20)} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Blockchain Verification
                </Text>
              </Group>

              <Alert
                mb="md"
                color={
                  verified ? (isDarkMode ? '#15e2b5' : 'green') : isDarkMode ? '#ff5c5c' : 'red'
                }
                icon={verified ? <IconCheck /> : <IconAlertTriangle />}
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

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text fw={500}>Document Hash:</Text>
                    <Text size="sm" ff="monospace">
                      {degree.verificationHash?.substring(0, 20)}
                      {degree.verificationHash && degree.verificationHash.length > 20 ? '...' : ''}
                    </Text>
                  </Group>
                  {degree.blockchainInfo && (
                    <>
                      <Group gap="xs">
                        <Text fw={500}>Record Created:</Text>
                        <Text>{degree.blockchainInfo.recordCreated || 'Not available'}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text fw={500}>Transaction ID:</Text>
                        <Text size="sm" ff="monospace">
                          {degree.blockchainInfo.txId?.substring(0, 20)}
                          {degree.blockchainInfo.txId && degree.blockchainInfo.txId.length > 20
                            ? '...'
                            : ''}
                        </Text>
                      </Group>
                      {degree.blockchainInfo.lastUpdated && (
                        <Group gap="xs">
                          <Text fw={500}>Last Updated:</Text>
                          <Text>{degree.blockchainInfo.lastUpdated}</Text>
                        </Group>
                      )}
                    </>
                  )}
                </Stack>
              </SimpleGrid>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
