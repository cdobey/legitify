import { useViewDegreeQuery } from '@/api/degrees/degree.queries';
import { Alert, Container, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';

export default function ViewDegree() {
  const { docId } = useParams<{ docId: string }>();

  const { data: degree, isLoading, error } = useViewDegreeQuery(docId!, { enabled: !!docId });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Alert color="red">{(error as Error).message}</Alert>;

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        View Degree
      </Title>
      {degree && (
        <>
          <Text>Document ID: {degree.docId}</Text>
          <Text>Issued By: {degree.issuer}</Text>
          <Text>Status: {degree.status}</Text>
          <Text>Issue Date: {new Date(degree.issueDate).toLocaleDateString()}</Text>
          {degree.fileData && (
            <embed
              src={`data:application/pdf;base64,${degree.fileData}`}
              type="application/pdf"
              width="100%"
              height="600px"
            />
          )}
        </>
      )}
    </Container>
  );
}
