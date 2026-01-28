import { CredentialDocument } from '@/api/credentials/credential.models';
import { useRequestAccessMutation } from '@/api/credentials/credential.mutations';
import {
  useAccessibleCredentialsQuery,
  useUserCredentialsQuery,
} from '@/api/credentials/credential.queries';
import { useSearchUserMutation } from '@/api/users/user.mutations';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Flex,
  Grid,
  Group,
  Loader,
  Menu,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAward,
  IconBriefcase,
  IconBuildingBank,
  IconCalendar,
  IconCertificate,
  IconChevronDown,
  IconClock,
  IconDatabase,
  IconEye,
  IconFilter,
  IconFilterOff,
  IconHourglassEmpty,
  IconInfoCircle,
  IconSchool,
  IconSearch,
  IconShieldLock,
  IconSortAscending,
  IconSortDescending,
  IconUserSearch,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function SearchUsers() {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [email, setEmail] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [sortBy, setSortBy] = useState<string>('issueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterByField, setFilterByField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const searchMutation = useSearchUserMutation();
  const requestAccessMutation = useRequestAccessMutation();

  const { data: accessibleCredentials = [], isLoading: accessibleLoading } =
    useAccessibleCredentialsQuery();

  const {
    data: credentials,
    isLoading: credentialsLoading,
    error: credentialsError,
  } = useUserCredentialsQuery(searchMutation.data?.id || '', {
    enabled: !!searchMutation.data?.id,
    staleTime: 1000 * 60 * 5,
  });

  const isAccessRequested = (docId: string) => {
    const accessCredential = accessibleCredentials.find(d => d.credentialId === docId);
    return accessCredential && accessCredential.status === 'pending';
  };

  const isAccessible = (docId: string) => {
    const accessCredential = accessibleCredentials.find(d => d.credentialId === docId);
    return accessCredential && accessCredential.status === 'granted';
  };

  const isAccessDenied = (docId: string) => {
    const accessCredential = accessibleCredentials.find(d => d.credentialId === docId);
    return accessCredential && accessCredential.status === 'denied';
  };

  const getRequestDate = (docId: string) => {
    const accessCredential = accessibleCredentials.find(d => d.credentialId === docId);
    return accessCredential && accessCredential.requestedAt
      ? formatDate(accessCredential.requestedAt)
      : '';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fieldsOfStudy = useMemo(() => {
    if (!credentials) return [];
    const fields = credentials
      .map(doc => doc.attributes?.fieldOfStudy || doc.domain)
      .filter((field): field is string => !!field);
    return [...new Set(fields)].sort();
  }, [credentials]);

  const accessibleDocIds = useMemo(() => {
    return new Set(accessibleCredentials.map(doc => doc.credentialId));
  }, [accessibleCredentials]);

  const filteredCredentials = useMemo(() => {
    if (!credentials) return [];

    let filtered = [...credentials];

    if (filterByField) {
      filtered = filtered.filter(
        doc => doc.attributes?.fieldOfStudy === filterByField || doc.domain === filterByField,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.title?.toLowerCase().includes(query) ||
          doc.issuer?.toLowerCase().includes(query) ||
          doc.domain?.toLowerCase().includes(query) ||
          doc.attributes?.fieldOfStudy?.toLowerCase().includes(query) ||
          doc.attributes?.honors?.toLowerCase().includes(query),
      );
    }

    if (activeTab === 'requested') {
      filtered = filtered.filter(doc => isAccessRequested(doc.docId));
    } else if (activeTab === 'accessible') {
      filtered = filtered.filter(doc => isAccessible(doc.docId));
    }

    console.log('Filtered credentials:', filtered);
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortBy) {
        case 'issueDate':
          valueA = new Date(a.issueDate || a.issueDate || '');
          valueB = new Date(b.issueDate || b.issueDate || '');
          break;
        case 'graduationDate':
        case 'achievementDate':
          valueA = a.achievementDate ? new Date(a.achievementDate) : new Date(0);
          valueB = b.achievementDate ? new Date(b.achievementDate) : new Date(0);
          break;
        case 'credentialTitle':
        case 'title':
          valueA = a.title || '';
          valueB = b.title || '';
          break;
        case 'issuer':
          valueA = a.issuer || '';
          valueB = b.issuer || '';
          break;
        default:
          valueA = a.issueDate || a.issueDate || '';
          valueB = b.issueDate || b.issueDate || '';
      }

      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return filtered;
  }, [
    credentials,
    filterByField,
    searchQuery,
    activeTab,
    sortBy,
    sortDirection,
    isAccessRequested,
    isAccessible,
    accessibleCredentials,
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSearchPerformed(true);
    searchMutation.mutate(email);
  };

  const handleRequestAccess = async (docId: string) => {
    try {
      await requestAccessMutation.mutateAsync(docId);

      notifications.show({
        title: 'Access Requested',
        message: 'Your access request has been sent successfully.',
        color: 'green',
      });
    } catch (error) {
      console.error('Error requesting access:', error);
      notifications.show({
        title: 'Request Failed',
        message: 'There was an error requesting access. Please try again.',
        color: 'red',
      });
    }
  };

  const getCredentialTypeIcon = (credential: CredentialDocument) => {
    const fieldLower =
      credential.attributes?.fieldOfStudy?.toLowerCase() ||
      credential.domain?.toLowerCase() ||
      credential.type?.toLowerCase() ||
      '';

    if (
      fieldLower.includes('computer') ||
      fieldLower.includes('software') ||
      fieldLower.includes('engineering')
    ) {
      return <IconDatabase size={20} color={theme.colors.blue[5]} />;
    } else if (
      fieldLower.includes('business') ||
      fieldLower.includes('management') ||
      fieldLower.includes('finance')
    ) {
      return <IconBriefcase size={20} color={theme.colors.indigo[5]} />;
    } else if (
      fieldLower.includes('medicine') ||
      fieldLower.includes('biology') ||
      fieldLower.includes('health')
    ) {
      return <IconCertificate size={20} color={theme.colors.green[5]} />;
    } else if (fieldLower.includes('law') || fieldLower.includes('legal')) {
      return <IconBuildingBank size={20} color={theme.colors.grape[5]} />;
    } else {
      return <IconSchool size={20} color={theme.colors.gray[5]} />;
    }
  };

  const clearFilters = () => {
    setFilterByField(null);
    setSearchQuery('');
    setActiveTab('all');
    setSortBy('issueDate');
    setSortDirection('desc');
  };

  const requestedCount = useMemo(() => {
    if (!credentials) return 0;
    return credentials.filter(doc => isAccessRequested(doc.docId)).length;
  }, [credentials, accessibleCredentials]);

  const accessibleCount = useMemo(() => {
    if (!credentials) return 0;
    return credentials.filter(doc => isAccessible(doc.docId)).length;
  }, [credentials, accessibleCredentials]);

  const getCredentialStatus = (docId: string) => {
    const accessCredential = accessibleCredentials.find(d => d.credentialId === docId);

    if (accessCredential) {
      if (accessCredential.status === 'granted') {
        return {
          badge: (
            <Badge color="teal" variant="light" radius="sm">
              Access Granted
            </Badge>
          ),
          icon: <IconEye size={16} />,
          label: 'Access Granted',
          color: 'teal' as const,
          buttonText: 'View Credential',
        };
      } else if (accessCredential.status === 'pending') {
        return {
          badge: (
            <Badge color="orange" variant="light" radius="sm">
              Access Requested
            </Badge>
          ),
          icon: <IconClock size={16} />,
          label: 'Access Requested',
          color: 'orange' as const,
          buttonText: 'Request Pending',
        };
      } else if (accessCredential.status === 'denied') {
        return {
          badge: (
            <Badge color="red" variant="light" radius="sm">
              Access Denied
            </Badge>
          ),
          icon: <IconX size={16} />,
          label: 'Access Denied',
          color: 'red' as const,
          buttonText: 'Request Access',
        };
      }
    }

    return {
      badge: (
        <Badge color="blue" variant="light" radius="sm">
          Not Requested
        </Badge>
      ),
      icon: <IconAward size={16} />,
      label: 'Request Access',
      color: 'blue' as const,
      buttonText: 'Request Access',
    };
  };

  const findAccessInfo = (docId: string) => {
    return accessibleCredentials.find(cred => cred.credentialId === docId);
  };

  return (
    <Container size="xl" px={isMobile ? 'xs' : 'md'}>
      <Paper p="xl" withBorder radius="md" mb="lg" shadow="sm">
        <Group mb="md">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconUserSearch size={24} />
          </ThemeIcon>
          <Title order={3}>Search Candidates</Title>
        </Group>

        <Text c="dimmed" mb="lg">
          Find candidates by email to request access to their credentials.
        </Text>

        <form onSubmit={handleSearch}>
          <Grid>
            <Grid.Col span={isMobile ? 12 : 9}>
              <TextInput
                label="Candidate Email"
                placeholder="Enter candidate's email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                rightSection={
                  searchMutation.isPending ? <Loader size="xs" /> : <IconSearch size={16} />
                }
                required
                size="md"
              />
            </Grid.Col>
            <Grid.Col span={isMobile ? 12 : 3} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                type="submit"
                loading={searchMutation.isPending}
                fullWidth
                size="md"
                variant="gradient"
                gradient={{ from: 'cyan', to: 'indigo' }}
              >
                Find Candidate
              </Button>
            </Grid.Col>
          </Grid>
        </form>
      </Paper>

      {searchMutation.isError && (
        <Alert color="red" title="Error" mb="lg" icon={<IconInfoCircle />}>
          {searchMutation.error.message || 'Error searching for user'}
        </Alert>
      )}

      {searchPerformed &&
        !searchMutation.isPending &&
        !searchMutation.data &&
        !searchMutation.isError && (
          <Alert color="yellow" title="No results" mb="lg" icon={<IconInfoCircle />}>
            No user found with that email address. Please verify the email and try again.
          </Alert>
        )}

      {searchMutation.data && (
        <Paper p="xl" withBorder radius="md" shadow="sm">
          <Box>
            <Card withBorder radius="md" p="md" mb="md">
              <Group justify="space-between" mb="md">
                <Group>
                  <Avatar size="lg" radius="xl" color="blue">
                    {searchMutation.data.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text fw={700} size="lg">
                      {searchMutation.data.username}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {searchMutation.data.email}
                    </Text>
                  </div>
                </Group>

                {fieldsOfStudy.length > 0 && (
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      Filter by field:
                    </Text>
                    <Select
                      size="xs"
                      placeholder="All fields"
                      value={filterByField}
                      onChange={setFilterByField}
                      data={[
                        { value: '', label: 'All fields' },
                        ...fieldsOfStudy.map(field => ({ value: field, label: field })),
                      ]}
                      style={{ width: '180px' }}
                      leftSection={<IconFilter size={14} />}
                      clearable
                    />
                  </Group>
                )}
              </Group>

              <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                <Tabs.List>
                  <Tabs.Tab
                    value="all"
                    leftSection={<IconDatabase size={16} />}
                    rightSection={
                      credentials?.length ? (
                        <Badge size="xs" variant="filled" color="gray">
                          {credentials.length}
                        </Badge>
                      ) : null
                    }
                  >
                    All Credentials
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="requested"
                    leftSection={<IconClock size={16} />}
                    rightSection={
                      requestedCount ? (
                        <Badge size="xs" variant="filled" color="blue">
                          {requestedCount}
                        </Badge>
                      ) : null
                    }
                  >
                    Pending Requests
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="accessible"
                    leftSection={<IconEye size={16} />}
                    rightSection={
                      accessibleCount ? (
                        <Badge size="xs" variant="filled" color="green">
                          {accessibleCount}
                        </Badge>
                      ) : null
                    }
                  >
                    Accessible
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs>

              <Group justify="space-between" mb="md">
                <Group>
                  {activeTab === 'all' && (
                    <Text size="sm" c="dimmed">
                      Showing all credentials for {searchMutation.data.username}
                    </Text>
                  )}
                  {activeTab === 'requested' && (
                    <Text size="sm" c="dimmed">
                      Showing credentials you've requested but don't have access to yet
                    </Text>
                  )}
                  {activeTab === 'accessible' && (
                    <Text size="sm" c="dimmed">
                      Showing credentials you already have access to
                    </Text>
                  )}
                </Group>

                <Group>
                  <TextInput
                    placeholder="Search credentials..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    size="xs"
                    leftSection={<IconSearch size={16} />}
                  />

                  <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                      <Button
                        variant="subtle"
                        rightSection={<IconChevronDown size={16} />}
                        leftSection={
                          sortDirection === 'asc' ? (
                            <IconSortAscending size={16} />
                          ) : (
                            <IconSortDescending size={16} />
                          )
                        }
                        size="xs"
                      >
                        Sort by:{' '}
                        {sortBy === 'issueDate'
                          ? 'Issue Date'
                          : sortBy === 'achievementDate' || sortBy === 'graduationDate'
                          ? 'Achievement Date'
                          : sortBy === 'credentialTitle' || sortBy === 'title'
                          ? 'Credential Title'
                          : 'Issuer'}
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>Sort credentials by</Menu.Label>
                      <Menu.Item
                        leftSection={<IconCalendar size={16} />}
                        onClick={() => setSortBy('issueDate')}
                        color={sortBy === 'issueDate' ? 'blue' : undefined}
                      >
                        Issue Date
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCalendar size={16} />}
                        onClick={() => setSortBy('achievementDate')}
                        color={
                          sortBy === 'achievementDate' || sortBy === 'graduationDate'
                            ? 'blue'
                            : undefined
                        }
                      >
                        Achievement Date
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCertificate size={16} />}
                        onClick={() => setSortBy('title')}
                        color={
                          sortBy === 'title' || sortBy === 'credentialTitle' ? 'blue' : undefined
                        }
                      >
                        Credential Title
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconBuildingBank size={16} />}
                        onClick={() => setSortBy('issuer')}
                        color={sortBy === 'issuer' ? 'blue' : undefined}
                      >
                        Issuer
                      </Menu.Item>

                      <Divider />

                      <Menu.Item
                        leftSection={<IconSortAscending size={16} />}
                        onClick={() => setSortDirection('asc')}
                        color={sortDirection === 'asc' ? 'blue' : undefined}
                      >
                        Ascending
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconSortDescending size={16} />}
                        onClick={() => setSortDirection('desc')}
                        color={sortDirection === 'desc' ? 'blue' : undefined}
                      >
                        Descending
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>

              {credentialsLoading || accessibleLoading ? (
                <Stack>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} height={160} radius="md" />
                  ))}
                </Stack>
              ) : credentialsError ? (
                <Alert color="red" mb="lg">
                  Error loading credentials
                </Alert>
              ) : filteredCredentials.length === 0 ? (
                <Center p="xl">
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" radius="xl" color="gray">
                      <IconHourglassEmpty size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" ta="center">
                      No credentials match your current filters
                    </Text>
                    <Button
                      variant="subtle"
                      onClick={clearFilters}
                      mt="sm"
                      leftSection={<IconFilterOff size={16} />}
                      size="xs"
                    >
                      Clear filters
                    </Button>
                  </Stack>
                </Center>
              ) : (
                <Stack gap="md">
                  <AnimatePresence>
                    {filteredCredentials.map(doc => {
                      const status = getCredentialStatus(doc.docId);
                      const accessInfo = findAccessInfo(doc.docId);
                      return (
                        <motion.div
                          key={doc.docId}
                          initial="hidden"
                          animate="visible"
                          variants={cardVariants}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            withBorder
                            p="md"
                            radius="md"
                            style={{
                              borderLeft: `4px solid ${
                                isAccessible(doc.docId)
                                  ? theme.colors.green[6]
                                  : isAccessRequested(doc.docId)
                                  ? theme.colors.blue[6]
                                  : 'transparent'
                              }`,
                            }}
                          >
                            <Grid>
                              <Grid.Col span={isMobile ? 12 : 8}>
                                <Group wrap="nowrap" align="flex-start" mb={isMobile ? 'xs' : 0}>
                                  <ThemeIcon size="lg" radius="md" variant="light">
                                    {getCredentialTypeIcon(doc)}
                                  </ThemeIcon>

                                  <div>
                                    <Group gap="xs" mb={2}>
                                      <Text fw={700} size="lg">
                                        {doc.title || 'Credential'}
                                      </Text>
                                      {status.badge}
                                      {doc.attributes?.honors && (
                                        <Badge color="green" variant="light">
                                          {doc.attributes.honors}
                                        </Badge>
                                      )}
                                    </Group>

                                    <Text size="sm" c="dimmed" mb={4}>
                                      {doc.domain ||
                                        doc.attributes?.fieldOfStudy ||
                                        doc.type ||
                                        'Field not specified'}
                                    </Text>

                                    <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                                      <Group gap={4} wrap="nowrap">
                                        <IconBuildingBank size={16} color={theme.colors.gray[6]} />
                                        <Text size="sm">{doc.issuer}</Text>
                                      </Group>

                                      <Group gap={4} wrap="nowrap">
                                        <IconCalendar size={16} color={theme.colors.gray[6]} />
                                        <Text size="sm">Issued: {formatDate(doc.issueDate)}</Text>
                                      </Group>

                                      {(doc.programLength || doc.attributes?.programDuration) && (
                                        <Group gap={4} wrap="nowrap">
                                          <IconCertificate size={16} color={theme.colors.gray[6]} />
                                          <Text size="sm">
                                            {doc.programLength || doc.attributes?.programDuration}
                                          </Text>
                                        </Group>
                                      )}

                                      {(doc.achievementDate || doc.attributes?.graduationDate) && (
                                        <Group gap={4} wrap="nowrap">
                                          <IconSchool size={16} color={theme.colors.gray[6]} />
                                          <Text size="sm">
                                            Achieved:{' '}
                                            {formatDate(
                                              doc.achievementDate || doc.attributes?.graduationDate,
                                            )}
                                          </Text>
                                        </Group>
                                      )}
                                    </SimpleGrid>

                                    {isAccessible(doc.docId) && accessInfo && (
                                      <Text size="xs" mt={8} c="dimmed">
                                        Access granted on: {formatDate(accessInfo.dateGranted)}
                                      </Text>
                                    )}
                                  </div>
                                </Group>
                              </Grid.Col>

                              <Grid.Col span={isMobile ? 12 : 4}>
                                <Flex
                                  direction="column"
                                  h="100%"
                                  justify="center"
                                  align={isMobile ? 'stretch' : 'flex-end'}
                                >
                                  {isAccessible(doc.docId) ? (
                                    <Button
                                      component={Link}
                                      to={`/credential/view/${doc.docId}`}
                                      variant="light"
                                      color="green"
                                      fullWidth={isMobile}
                                      leftSection={<IconEye size={16} />}
                                    >
                                      View Credential
                                    </Button>
                                  ) : isAccessDenied(doc.docId) ? (
                                    <div className="access-denied-indicator">
                                      <ThemeIcon size="sm" variant="light">
                                        <IconShieldLock size={16} />
                                      </ThemeIcon>
                                      <span className="access-denied-text">
                                        Access Denied by User
                                      </span>
                                    </div>
                                  ) : (
                                    <Button
                                      onClick={() => handleRequestAccess(doc.docId)}
                                      loading={
                                        requestAccessMutation.isPending &&
                                        requestAccessMutation.variables === doc.docId
                                      }
                                      variant={isAccessRequested(doc.docId) ? 'light' : 'filled'}
                                      color={isAccessRequested(doc.docId) ? 'gray' : 'blue'}
                                      fullWidth={isMobile}
                                      leftSection={status.icon}
                                      disabled={isAccessRequested(doc.docId)}
                                    >
                                      {status.buttonText}
                                    </Button>
                                  )}

                                  {isAccessRequested(doc.docId) && !isAccessible(doc.docId) && (
                                    <Text
                                      size="xs"
                                      c="dimmed"
                                      mt={4}
                                      ta={isMobile ? 'left' : 'right'}
                                    >
                                      Requested on {getRequestDate(doc.docId)}
                                    </Text>
                                  )}
                                </Flex>
                              </Grid.Col>
                            </Grid>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </Stack>
              )}

              {credentials && credentials.length === 0 && (
                <Center p="xl">
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" radius="xl" color="gray">
                      <IconCertificate size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" ta="center">
                      This user has no accessible credentials
                    </Text>
                  </Stack>
                </Center>
              )}
            </Card>
          </Box>
        </Paper>
      )}
    </Container>
  );
}
