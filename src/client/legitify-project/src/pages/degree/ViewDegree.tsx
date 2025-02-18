import { Alert, Container, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { viewDegree } from "../../services/degreeService";

export default function ViewDegree() {
  const { docId } = useParams();
  const [degree, setDegree] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDegree = async () => {
      try {
        const data = await viewDegree(docId!);
        setDegree(data);
      } catch (err: any) {
        setError(err.message || "Failed to load degree");
      } finally {
        setLoading(false);
      }
    };

    loadDegree();
  }, [docId]);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Alert color="red">{error}</Alert>;

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        View Degree
      </Title>
      {degree && (
        <>
          <Text>Document ID: {degree.docId}</Text>
          <Text>Issued By: {degree.issuedBy}</Text>
          <Text>Issued To: {degree.issuedTo}</Text>
          <Text>
            Issue Date: {new Date(degree.issueDate).toLocaleDateString()}
          </Text>
          {degree.base64File && (
            <embed
              src={`data:application/pdf;base64,${degree.base64File}`}
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
