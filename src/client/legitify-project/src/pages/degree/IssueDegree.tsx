import {
  Alert,
  Button,
  Container,
  FileInput,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { issueDegree } from "../../services/degreeService";
import { hashFile } from "../../utils/fileUtils";

export default function IssueDegree() {
  const [individualId, setIndividualId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !individualId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const fileHash = await hashFile(file);
      const result = await issueDegree(individualId, fileHash);
      setSuccess(`Degree issued successfully! Document ID: ${result.docId}`);
    } catch (err: any) {
      setError(err.message || "Failed to issue degree");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm">
      <Title order={2} mb="xl">
        Issue New Degree
      </Title>
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Individual ID"
          required
          value={individualId}
          onChange={(e) => setIndividualId(e.currentTarget.value)}
          mb="md"
        />
        <FileInput
          label="Degree Document"
          required
          accept="application/pdf"
          value={file}
          onChange={setFile}
          mb="xl"
        />
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="green" mb="md">
            {success}
          </Alert>
        )}
        <Button type="submit" loading={loading} fullWidth>
          Issue Degree
        </Button>
      </form>
    </Container>
  );
}
