import { Alert, Badge, Container, Paper, Stack, Table, Text } from '@mantine/core';
import { useLedgerRecordsQuery } from '../../api/degrees/degree.queries';

export default function AllRecords() {
  const { data: records, isLoading, error } = useLedgerRecordsQuery();

  if (isLoading) {
    return (
      <Container size="md" py="xl" style={{ textAlign: 'center', padding: '2rem' }}>
        <Text>Loading all blockchain records...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" mb="lg">
          {(error as Error).message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl" className="page-content">
      <Paper withBorder radius="md" p="md" mb="xl">
        <Text mb="md">
          This page displays all degree records stored on the blockchain ledger. These records
          represent the immutable proof of issuance for all credentials in the system.
        </Text>

        {!records?.length ? (
          <Alert color="gray">No records found in the blockchain ledger</Alert>
        ) : (
          <Stack>
            <Text size="sm" c="dimmed" mb="md">
              Total Records: {records.length}
            </Text>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Document ID</Table.Th>
                  <Table.Th>Owner</Table.Th>
                  <Table.Th>Issuer</Table.Th>
                  <Table.Th>Issue Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record: any) => (
                  <Table.Tr key={record.docId}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {record.docId}
                      </Text>
                    </Table.Td>
                    <Table.Td>{record.owner}</Table.Td>
                    <Table.Td>{record.issuer}</Table.Td>
                    <Table.Td>
                      {new Date(record.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={record.accepted ? 'green' : record.denied ? 'red' : 'blue'}>
                        {record.accepted ? 'Accepted' : record.denied ? 'Denied' : 'Pending'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
