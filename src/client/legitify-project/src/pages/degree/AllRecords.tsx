import {
  ActionIcon,
  Alert,
  Badge,
  Container,
  Flex,
  Group,
  Menu,
  Pagination,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconArrowsSort,
  IconBuilding,
  IconCalendarTime,
  IconCertificate,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconEye,
  IconEyeClosed,
  IconFilter,
  IconInfoCircle,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconUser,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccessibleDegree, LedgerRecord } from '../../api/degrees/degree.models';
import { useAccessibleDegreesQuery, useLedgerRecordsQuery } from '../../api/degrees/degree.queries';
import { useAuth } from '../../contexts/AuthContext';

// Type to handle both record types
type RecordType = LedgerRecord | AccessibleDegree;

export default function AllRecords() {
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';

  // Conditionally use the appropriate query based on user role
  const {
    data: universityRecords = [],
    isLoading: isLoadingUniRecords,
    error: uniError,
  } = useLedgerRecordsQuery({
    enabled: !isEmployer,
  });

  const {
    data: employerRecords = [],
    isLoading: isLoadingEmpRecords,
    error: empError,
  } = useAccessibleDegreesQuery({
    enabled: isEmployer,
  });

  // Combine records based on user role
  const records = useMemo(() => {
    return isEmployer ? employerRecords : universityRecords;
  }, [isEmployer, employerRecords, universityRecords]);

  const isLoading = isEmployer ? isLoadingEmpRecords : isLoadingUniRecords;
  const error = isEmployer ? empError : uniError;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('issuedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'pending' | 'denied'>(
    'all',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const theme = useMantineTheme();

  // Helper function to get a property safely from either record type
  const getRecordProperty = (record: RecordType, field: string): any => {
    if (isEmployer) {
      // Handle AccessibleDegree type
      const accessibleRecord = record as AccessibleDegree;
      switch (field) {
        case 'docId':
          return accessibleRecord.docId;
        case 'issuer':
          return accessibleRecord.issuer;
        case 'ownerEmail':
          return accessibleRecord.owner?.email;
        case 'universityName':
          return accessibleRecord.issuer;
        case 'issuedAt':
          return accessibleRecord.requestedAt;
        case 'dateGranted':
          return accessibleRecord.status === 'granted'
            ? accessibleRecord.dateGranted
            : accessibleRecord.requestedAt;
        case 'accepted':
          return accessibleRecord.status === 'granted';
        case 'denied':
          return accessibleRecord.status === 'denied';
        case 'degreeTitle':
          // For employers, we might not have this field
          return 'Degree Certificate';
        case 'status':
          return accessibleRecord.status;
        case 'owner':
          return accessibleRecord.owner?.name || '';
        default:
          return '';
      }
    } else {
      // Handle LedgerRecord type
      const ledgerRecord = record as LedgerRecord;
      return ledgerRecord[field as keyof LedgerRecord];
    }
  };

  // Filter records based on search query and status filter
  const filteredRecords = useMemo(() => {
    return records
      .filter((record: RecordType) => {
        // Apply search filter with unified field access
        const matchesSearch =
          getRecordProperty(record, 'docId')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (getRecordProperty(record, 'ownerEmail') || '')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (getRecordProperty(record, 'universityName') || '')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          getRecordProperty(record, 'owner')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          getRecordProperty(record, 'issuer')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (getRecordProperty(record, 'degreeTitle') || '')
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        // Apply status filter with unified field access
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'accepted' &&
            (getRecordProperty(record, 'accepted') ||
              (isEmployer && getRecordProperty(record, 'status') === 'granted'))) ||
          (statusFilter === 'denied' &&
            (getRecordProperty(record, 'denied') ||
              (isEmployer && getRecordProperty(record, 'status') === 'denied'))) ||
          (statusFilter === 'pending' &&
            !(
              getRecordProperty(record, 'accepted') ||
              (isEmployer && getRecordProperty(record, 'status') === 'granted')
            ) &&
            !(
              getRecordProperty(record, 'denied') ||
              (isEmployer && getRecordProperty(record, 'status') === 'denied')
            ));

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort with unified field access
        const fieldA = getRecordProperty(a, sortField);
        const fieldB = getRecordProperty(b, sortField);

        // Sort based on value types
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortDirection === 'asc'
            ? fieldA.localeCompare(fieldB)
            : fieldB.localeCompare(fieldA);
        }

        if (typeof fieldA === 'boolean' && typeof fieldB === 'boolean') {
          return sortDirection === 'asc'
            ? fieldA === fieldB
              ? 0
              : fieldA
              ? 1
              : -1
            : fieldA === fieldB
            ? 0
            : fieldA
            ? -1
            : 1;
        }

        // For numbers and other types, use standard comparison
        return sortDirection === 'asc'
          ? fieldA > fieldB
            ? 1
            : fieldA < fieldB
            ? -1
            : 0
          : fieldA < fieldB
          ? 1
          : fieldA > fieldB
          ? -1
          : 0;
      });
  }, [records, searchQuery, sortField, sortDirection, statusFilter, isEmployer]);

  // Get paginated records
  const currentRecords = useMemo(() => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  }, [filteredRecords, currentPage, recordsPerPage]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRecords.length / recordsPerPage));
  }, [filteredRecords, recordsPerPage]);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortField, sortDirection]);

  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing page
    window.scrollTo(0, 0);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle sort direction if clicking the same field
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // Set new field and default to descending sort
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <IconArrowsSort size={16} />;
    return sortDirection === 'asc' ? (
      <IconSortAscending size={16} />
    ) : (
      <IconSortDescending size={16} />
    );
  };

  const renderSortableHeader = (field: string, label: string, icon: JSX.Element) => (
    <Table.Th className="sortable-header">
      <Group gap="xs" wrap="nowrap" onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
        {icon}
        <Text span>{label}</Text>
        {getSortIcon(field)}
      </Group>
    </Table.Th>
  );

  const getPageTitle = () => {
    return isEmployer ? 'Accessible Degrees' : 'Blockchain Records';
  };

  const getEmptyMessage = () => {
    return isEmployer
      ? "You don't have access to any degrees yet. You can search for individuals and request access to their degrees from the Verify Degrees page."
      : 'No records found in the blockchain ledger at this time.';
  };

  if (isLoading) {
    return (
      <Container size="xl" py="xl" style={{ textAlign: 'center', padding: '2rem' }}>
        <Text>Loading {isEmployer ? 'accessible degrees' : 'blockchain records'}...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="red"
          title={`Error Loading ${isEmployer ? 'Accessible Degrees' : 'Records'}`}
          mb="lg"
        >
          {(error as Error).message}
        </Alert>
      </Container>
    );
  }

  // Create table rows from current page of records
  const rows = currentRecords.map((record: RecordType) => {
    // Get status information with unified field access
    const isAccepted = getRecordProperty(record, 'accepted');
    const isDenied = getRecordProperty(record, 'denied');
    const status = isEmployer
      ? getRecordProperty(record, 'status')
      : isAccepted
      ? 'accepted'
      : isDenied
      ? 'denied'
      : 'pending';

    // Determine status colors and icons
    const statusColor =
      isAccepted || status === 'accepted' || status === 'granted'
        ? 'teal'
        : isDenied || status === 'denied'
        ? 'red'
        : 'amber';

    const statusIcon =
      isAccepted || status === 'accepted' || status === 'granted' ? (
        <IconCircleCheck size={14} />
      ) : isDenied || status === 'denied' ? (
        <IconCircleX size={14} />
      ) : (
        <IconClockHour4 size={14} />
      );

    const dateField = isEmployer ? 'dateGranted' : 'issuedAt';
    const dateValue = getRecordProperty(record, dateField);
    const issueDate = new Date(dateValue);
    const formattedDate = issueDate.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const docId = getRecordProperty(record, 'docId');

    return (
      <Table.Tr
        key={docId}
        style={{
          cursor: 'pointer',
          opacity: status === 'pending' ? 0.7 : 1,
          background: status === 'pending' ? 'rgba(255, 171, 64, 0.05)' : undefined,
        }}
        className={`record-row ${status === 'pending' ? 'pending-record' : ''}`}
        onClick={e => {
          // For pending records, show alert instead of navigation
          if (status === 'pending' && isEmployer) {
            e.preventDefault();
            e.stopPropagation();

            modals.open({
              title: (
                <Text fw={700} size="lg" c="blue">
                  Access Request Pending
                </Text>
              ),
              children: (
                <Stack>
                  <Text>
                    Your request to view this degree certificate is still pending approval from
                    <Text span fw={700} ml={5}>
                      {getRecordProperty(record, 'owner')}
                    </Text>
                    .
                  </Text>
                  <Text size="sm" c="dimmed">
                    Document ID: {docId}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Requested on: {formattedDate}
                  </Text>
                  <Text mt="md">
                    You'll receive access once the individual approves your request.
                  </Text>
                </Stack>
              ),
              centered: true,
            });
          } else {
            window.location.href = `/degree/view/${docId}`;
          }
        }}
      >
        <Table.Td>
          <Group gap="md" wrap="nowrap">
            <div>
              <Text fw={500} size="sm">
                {getRecordProperty(record, 'degreeTitle') || 'Degree Certificate'}
              </Text>
              {getRecordProperty(record, 'fieldOfStudy') && (
                <Text size="xs" c="dimmed">
                  {getRecordProperty(record, 'fieldOfStudy')}
                </Text>
              )}
            </div>
          </Group>
        </Table.Td>

        <Table.Td>
          <Text size="sm">{getRecordProperty(record, 'ownerEmail') || 'No Email'}</Text>
          {!getRecordProperty(record, 'ownerEmail') && getRecordProperty(record, 'owner') && (
            <Text size="xs" c="dimmed">
              {typeof getRecordProperty(record, 'owner') === 'string'
                ? getRecordProperty(record, 'owner').length > 20
                  ? `${getRecordProperty(record, 'owner').substring(0, 20)}...`
                  : getRecordProperty(record, 'owner')
                : getRecordProperty(record, 'owner').name || ''}
            </Text>
          )}
        </Table.Td>

        <Table.Td>
          <Text size="sm">
            {getRecordProperty(record, 'universityName') ||
              getRecordProperty(record, 'issuer') ||
              'No Institution'}
          </Text>
          {!getRecordProperty(record, 'universityName') && getRecordProperty(record, 'issuer') && (
            <Text size="xs" c="dimmed" truncate>
              {getRecordProperty(record, 'issuer').length > 20
                ? `${getRecordProperty(record, 'issuer').substring(0, 20)}...`
                : getRecordProperty(record, 'issuer')}
            </Text>
          )}
        </Table.Td>

        <Table.Td>{formattedDate}</Table.Td>

        <Table.Td>
          <Badge color={statusColor} className={`status-badge status-${statusColor}`}>
            {status === 'accepted' || status === 'granted'
              ? isEmployer
                ? 'Granted'
                : 'Accepted'
              : status === 'denied'
              ? 'Denied'
              : 'Pending'}
          </Badge>
        </Table.Td>

        <Table.Td>
          {status === 'pending' && isEmployer ? (
            <ActionIcon
              variant="light"
              radius="md"
              color="gray"
              className="view-action"
              onClick={e => {
                e.stopPropagation();
                // Show alert for pending records
                modals.open({
                  title: (
                    <Text fw={700} size="lg" c="blue">
                      Access Request Pending
                    </Text>
                  ),
                  children: (
                    <Stack>
                      <Text>
                        Your request to view this degree certificate is still pending approval from
                        <Text span fw={700} ml={5}>
                          {getRecordProperty(record, 'owner')}
                        </Text>
                        .
                      </Text>
                      <Text size="sm" c="dimmed">
                        Document ID: {docId}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Requested on: {formattedDate}
                      </Text>
                      <Text mt="md">
                        You'll receive access once the individual approves your request.
                      </Text>
                    </Stack>
                  ),
                  centered: true,
                });
              }}
            >
              <IconEyeClosed size={16} />
            </ActionIcon>
          ) : status === 'denied' && isEmployer ? (
            <ActionIcon
              variant="light"
              radius="md"
              color="red"
              className="view-action"
              onClick={e => {
                e.stopPropagation();
                // Show alert for denied records
                modals.open({
                  title: (
                    <Text fw={700} size="lg" c="red">
                      Access Request Denied
                    </Text>
                  ),
                  children: (
                    <Stack>
                      <Text>
                        Your request to view this degree certificate has been denied by
                        <Text span fw={700} ml={5}>
                          {getRecordProperty(record, 'owner')}
                        </Text>
                        .
                      </Text>
                      <Text size="sm" c="dimmed">
                        Document ID: {docId}
                      </Text>
                      <Text mt="md">
                        You may need to contact the individual directly if you require access to
                        this degree.
                      </Text>
                    </Stack>
                  ),
                  centered: true,
                });
              }}
            >
              <IconEyeClosed size={16} />
            </ActionIcon>
          ) : (
            <ActionIcon
              variant="light"
              radius="md"
              color="blue"
              component={Link}
              to={`/degree/view/${docId}`}
              className="view-action"
              onClick={e => e.stopPropagation()}
            >
              <IconEye size={16} />
            </ActionIcon>
          )}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container size="xl" py="xl" className="page-content">
      <Paper shadow="sm" radius="md" p="md">
        <Flex direction="column" gap="md">
          <Group>
            <TextInput
              placeholder={`Search ${isEmployer ? 'accessible degrees' : 'records'}...`}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={event => setSearchQuery(event.currentTarget.value)}
              radius="md"
              style={{ flex: 1 }}
            />

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Tooltip label="Filter by status">
                  <ActionIcon
                    variant="light"
                    color={statusFilter !== 'all' ? 'blue' : 'gray'}
                    radius="md"
                  >
                    <IconFilter size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Filter by Status</Menu.Label>
                <Menu.Item
                  leftSection={<IconFilter size={14} />}
                  onClick={() => setStatusFilter('all')}
                  color={statusFilter === 'all' ? 'blue' : undefined}
                >
                  All Records
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCircleCheck size={14} />}
                  onClick={() => setStatusFilter('accepted')}
                  color={statusFilter === 'accepted' ? 'teal' : undefined}
                >
                  Accepted Only
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconClockHour4 size={14} />}
                  onClick={() => setStatusFilter('pending')}
                  color={statusFilter === 'pending' ? 'amber' : undefined}
                >
                  Pending Only
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCircleX size={14} />}
                  onClick={() => setStatusFilter('denied')}
                  color={statusFilter === 'denied' ? 'red' : undefined}
                >
                  Denied Only
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {!records?.length ? (
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              title={isEmployer ? 'No Accessible Degrees' : 'No Records Yet'}
              radius="md"
            >
              {getEmptyMessage()}
            </Alert>
          ) : !filteredRecords.length ? (
            <Alert icon={<IconSearch size={16} />} color="orange" title="No Matches" radius="md">
              No records match your search query: "{searchQuery}"
            </Alert>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                Showing{' '}
                {Math.min(
                  recordsPerPage,
                  filteredRecords.length - (currentPage - 1) * recordsPerPage,
                )}{' '}
                of {filteredRecords.length} {isEmployer ? 'degrees' : 'records'}
                {statusFilter !== 'all' && ` (${statusFilter})`}
                {` - Page ${currentPage} of ${totalPages}`}
              </Text>
              <ScrollArea
                style={{ height: 'calc(min(100vh - 250px, 10 * 53px))' }}
                scrollbarSize={6}
                className="records-table-container"
              >
                <Table highlightOnHover striped verticalSpacing="sm" className="records-table">
                  <Table.Thead>
                    <Table.Tr>
                      {renderSortableHeader('degreeTitle', 'Degree', <IconCertificate size={14} />)}
                      {renderSortableHeader('ownerEmail', 'Student', <IconUser size={14} />)}
                      {renderSortableHeader(
                        'universityName',
                        'Institution',
                        <IconBuilding size={14} />,
                      )}
                      {renderSortableHeader(
                        isEmployer ? 'dateGranted' : 'issuedAt',
                        isEmployer ? 'Access Date' : 'Issue Date',
                        <IconCalendarTime size={14} />,
                      )}
                      {renderSortableHeader('status', 'Status', <IconCircleCheck size={14} />)}
                      <Table.Th style={{ width: 60 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{rows}</Table.Tbody>
                </Table>
              </ScrollArea>

              {totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination
                    value={currentPage}
                    onChange={handlePageChange}
                    total={totalPages}
                    radius="md"
                    withEdges
                    className="records-pagination"
                  />
                </Group>
              )}
            </>
          )}
        </Flex>
      </Paper>
    </Container>
  );
}
