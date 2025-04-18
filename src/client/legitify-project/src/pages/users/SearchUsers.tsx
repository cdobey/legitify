import { useRequestAccessMutation } from '@/api/degrees/degree.mutations';
import { useAccessibleDegreesQuery, useUserDegreesQuery } from '@/api/degrees/degree.queries';
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
import { useLocalStorage, useMediaQuery } from '@mantine/hooks';
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
  IconSortAscending,
  IconSortDescending,
  IconUserSearch,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface DegreeDocument {
  docId: string;
  issuer: string;
  issueDate: string;
  degreeTitle?: string;
  fieldOfStudy?: string;
  graduationDate?: string;
  honors?: string;
  studentId?: string;
  programDuration?: string;
  gpa?: number | null;
}

interface AccessibleDegree {
  requestId: string;
  docId: string;
  issuer: string;
  owner: {
    name: string;
    email: string;
  };
  status: string;
  dateGranted: string;
}

interface RequestedAccess {
  docId: string;
  timestamp: number;
}

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

  // Store requested access in local storage to persist between page reloads
  const [requestedAccesses, setRequestedAccesses] = useLocalStorage<RequestedAccess[]>({
    key: 'requested-degree-accesses',
    defaultValue: [],
  });

  const searchMutation = useSearchUserMutation();
  const requestAccessMutation = useRequestAccessMutation();

  // Fetch accessible degrees (ones the employer already has access to)
  const { data: accessibleDegrees = [], isLoading: accessibleLoading } =
    useAccessibleDegreesQuery();

  const {
    data: degrees,
    isLoading: degreesLoading,
    error: degreesError,
  } = useUserDegreesQuery(searchMutation.data?.id || '', {
    enabled: !!searchMutation.data?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const fieldsOfStudy = useMemo(() => {
    if (!degrees) return [];
    const fields = degrees.map(doc => doc.fieldOfStudy).filter((field): field is string => !!field);
    return [...new Set(fields)].sort();
  }, [degrees]);

  const accessibleDocIds = useMemo(() => {
    return new Set(accessibleDegrees.map(doc => doc.docId));
  }, [accessibleDegrees]);

  const filteredDegrees = useMemo(() => {
    if (!degrees) return [];

    let filtered = [...degrees];

    if (filterByField) {
      filtered = filtered.filter(doc => doc.fieldOfStudy === filterByField);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.degreeTitle?.toLowerCase().includes(query) ||
          doc.issuer?.toLowerCase().includes(query) ||
          doc.fieldOfStudy?.toLowerCase().includes(query) ||
          doc.honors?.toLowerCase().includes(query),
      );
    }

    // Apply tab filter
    if (activeTab === 'requested') {
      filtered = filtered.filter(
        doc =>
          requestedAccesses.some(req => req.docId === doc.docId) &&
          !accessibleDocIds.has(doc.docId),
      );
    } else if (activeTab === 'accessible') {
      filtered = filtered.filter(doc => accessibleDocIds.has(doc.docId));
    }

    // Sort documents
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortBy) {
        case 'issueDate':
          valueA = new Date(a.issueDate);
          valueB = new Date(b.issueDate);
          break;
        case 'graduationDate':
          valueA = a.graduationDate ? new Date(a.graduationDate) : new Date(0);
          valueB = b.graduationDate ? new Date(b.graduationDate) : new Date(0);
          break;
        case 'degreeTitle':
          valueA = a.degreeTitle || '';
          valueB = b.degreeTitle || '';
          break;
        case 'issuer':
          valueA = a.issuer || '';
          valueB = b.issuer || '';
          break;
        default:
          valueA = a.issueDate;
          valueB = b.issueDate;
      }

      // Handle comparison
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    return filtered;
  }, [
    degrees,
    filterByField,
    searchQuery,
    activeTab,
    sortBy,
    sortDirection,
    requestedAccesses,
    accessibleDocIds,
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

      // Update local storage with newly requested access
      setRequestedAccesses(prev => [...prev, { docId, timestamp: Date.now() }]);

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

  const getDegreeTypeIcon = (degree: DegreeDocument) => {
    const fieldLower = degree.fieldOfStudy?.toLowerCase() || '';

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

  const isAccessRequested = (docId: string) => {
    return requestedAccesses.some(req => req.docId === docId);
  };

  const isAccessible = (docId: string) => {
    return accessibleDocIds.has(docId);
  };

  // Clear filters
  const clearFilters = () => {
    setFilterByField(null);
    setSearchQuery('');
    setActiveTab('all');
    setSortBy('issueDate');
    setSortDirection('desc');
  };

  // Get counts for different categories
  const requestedCount = useMemo(() => {
    if (!degrees) return 0;
    return degrees.filter(doc => isAccessRequested(doc.docId) && !isAccessible(doc.docId)).length;
  }, [degrees, requestedAccesses, accessibleDocIds]);

  const accessibleCount = useMemo(() => {
    if (!degrees) return 0;
    return degrees.filter(doc => isAccessible(doc.docId)).length;
  }, [degrees, accessibleDocIds]);

  // Format the date string
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper to get the status of a credential
  const getCredentialStatus = (docId: string) => {
    if (isAccessible(docId)) {
      return {
        badge: <Badge color="green">Accessible</Badge>,
        icon: <IconEye size={16} />,
        label: 'Access Granted',
        color: 'green' as const,
        buttonText: 'View Credential',
      };
    } else if (isAccessRequested(docId)) {
      return {
        badge: <Badge color="blue">Requested</Badge>,
        icon: <IconClock size={16} />,
        label: 'Access Requested',
        color: 'blue' as const,
        buttonText: 'Request Pending',
      };
    } else {
      return {
        badge: (
          <Badge color="gray" variant="outline">
            Not Requested
          </Badge>
        ),
        icon: <IconAward size={16} />,
        label: 'Request Access',
        color: 'indigo' as const,
        buttonText: 'Request Access',
      };
    }
  };

  const findAccessInfo = (docId: string) => {
    return accessibleDegrees.find(deg => deg.docId === docId);
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
          Find candidates by email to request access to their academic credentials.
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
                      degrees?.length ? (
                        <Badge size="xs" variant="filled" color="gray">
                          {degrees.length}
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
                          : sortBy === 'graduationDate'
                          ? 'Graduation Date'
                          : sortBy === 'degreeTitle'
                          ? 'Degree Title'
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
                        onClick={() => setSortBy('graduationDate')}
                        color={sortBy === 'graduationDate' ? 'blue' : undefined}
                      >
                        Graduation Date
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCertificate size={16} />}
                        onClick={() => setSortBy('degreeTitle')}
                        color={sortBy === 'degreeTitle' ? 'blue' : undefined}
                      >
                        Degree Title
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

              {degreesLoading || accessibleLoading ? (
                <Stack>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} height={160} radius="md" />
                  ))}
                </Stack>
              ) : degreesError ? (
                <Alert color="red" mb="lg">
                  Error loading credentials
                </Alert>
              ) : filteredDegrees.length === 0 ? (
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
                    {filteredDegrees.map(doc => {
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
                                    {getDegreeTypeIcon(doc)}
                                  </ThemeIcon>

                                  <div>
                                    <Group gap="xs" mb={2}>
                                      <Text fw={700} size="lg">
                                        {doc.degreeTitle || 'Degree'}
                                      </Text>
                                      {status.badge}
                                      {doc.honors && (
                                        <Badge color="green" variant="light">
                                          {doc.honors}
                                        </Badge>
                                      )}
                                    </Group>

                                    <Text size="sm" c="dimmed" mb={4}>
                                      {doc.fieldOfStudy || 'Field not specified'}
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

                                      {doc.programDuration && (
                                        <Group gap={4} wrap="nowrap">
                                          <IconCertificate size={16} color={theme.colors.gray[6]} />
                                          <Text size="sm">{doc.programDuration}</Text>
                                        </Group>
                                      )}

                                      {doc.graduationDate && (
                                        <Group gap={4} wrap="nowrap">
                                          <IconSchool size={16} color={theme.colors.gray[6]} />
                                          <Text size="sm">
                                            Graduated: {formatDate(doc.graduationDate)}
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
                                      to={`/degree/view/${doc.docId}`}
                                      variant="light"
                                      color="green"
                                      fullWidth={isMobile}
                                      leftSection={<IconEye size={16} />}
                                    >
                                      View Credential
                                    </Button>
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
                                      Requested on{' '}
                                      {formatDate(
                                        new Date(
                                          requestedAccesses.find(req => req.docId === doc.docId)
                                            ?.timestamp || Date.now(),
                                        ).toISOString(),
                                      )}
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

              {degrees && degrees.length === 0 && (
                <Center p="xl">
                  <Stack align="center" gap="xs">
                    <ThemeIcon size="xl" radius="xl" color="gray">
                      <IconCertificate size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" ta="center">
                      This user has no accessible documents
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
