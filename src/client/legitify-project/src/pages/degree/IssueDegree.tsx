import {
  Alert,
  Button,
  Container,
  FileInput,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useIssueDegree } from "../../api/degrees/degree.queries";
import { useAuth } from "../../contexts/AuthContext";
import { fileToBase64 } from "../../utils/fileUtils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function IssueDegree() {
  const [individualId, setIndividualId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { refreshSession } = useAuth();
  const issueMutation = useIssueDegree();

  const handleFileChange = (file: File | null) => {
    setLocalError(null);
    if (file && file.size > MAX_FILE_SIZE) {
      setLocalError("File size must be less than 5MB");
      setFile(null);
      return;
    }
    setFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess("");

    if (!file || !individualId) {
      setLocalError("Please provide both Individual ID and a file");
      return;
    }

    try {
      // Try refreshing the session token first to ensure it's valid
      await refreshSession();

      const base64File = await fileToBase64(file);
      console.log("Submitting degree issuance for individual:", individualId);

      const result = await issueMutation.mutateAsync({
        individualId,
        base64File,
      });

      setSuccess(`Degree issued successfully! Document ID: ${result.docId}`);
      setIndividualId("");
      setFile(null);
    } catch (error: any) {
      console.error("Degree issuance failed:", error);
      setLocalError(error.message || "Failed to issue degree");
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
          onChange={handleFileChange}
          mb="xl"
        />
        {(issueMutation.error || localError) && (
          <Alert color="red" mb="md">
            {localError || (issueMutation.error as Error).message}
          </Alert>
        )}
        {success && (
          <Alert color="green" mb="md">
            {success}
          </Alert>
        )}
        <Button type="submit" loading={issueMutation.isPending} fullWidth>
          Issue Degree
        </Button>
      </form>
    </Container>
  );
}
