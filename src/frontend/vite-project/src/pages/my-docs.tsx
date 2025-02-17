"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  Table, 
  Text, 
  Button, 
  Container, 
  Center, 
  Loader, 
  Title 
} from "@mantine/core";
import { FileText, Download } from "@tabler/icons";
import axios from "axios";

interface Document {
  id: string;
  name: string;
  issueDate: string;
  university: string;
}

const MyDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get("/api/documents", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setDocuments(response.data);
      } catch (error) {
        setError("Failed to fetch documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  if (!user) {
    return <Center><Text>Please log in to view your documents.</Text></Center>;
  }

  return (
    <Container>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
          <FileText style={{ marginRight: "0.5rem" }} /> My Documents
        </Title>
        <Text size="sm" color="dimmed" style={{ marginBottom: "1rem", textAlign: "center" }}>
          View and manage your degree documents
        </Text>
        {isLoading ? (
          <Center>
            <Loader />
            <Text style={{ marginLeft: "0.5rem" }}>Loading documents...</Text>
          </Center>
        ) : error ? (
          <Text color="red" style={{ textAlign: "center" }}>
            {error}
          </Text>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Issue Date</th>
                <th>University</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>{new Date(doc.issueDate).toLocaleDateString()}</td>
                  <td>{doc.university}</td>
                  <td>
                    <Button variant="outline" size="sm">
                      <Download style={{ marginRight: "0.5rem" }} /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </Container>
  );
};

export default MyDocuments;
