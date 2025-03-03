import {
  Alert,
  Button,
  Container,
  FileInput,
  Progress,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useIssueDegree } from "../../api/degrees/degree.queries";
import { useAuth } from "../../contexts/AuthContext";
import { fileToBase64 } from "../../utils/fileUtils";

// Reduced to 3MB for safer uploads with base64 encoding (which increases size by ~33%)
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

export default function IssueDegree() {
  const [individualId, setIndividualId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { refreshSession } = useAuth();
  const issueMutation = useIssueDegree();

  const handleFileChange = (file: File | null) => {
    setLocalError(null);
    if (!file) {
      setFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError(
        `File size must be less than ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB. Current file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      );
      setFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setLocalError("Only PDF files are accepted");
      setFile(null);
      return;
    }

    setFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess("");
    setIsUploading(true);
    setUploadProgress(0);

    if (!file || !individualId) {
      setLocalError("Please provide both Individual ID and a file");
      setIsUploading(false);
      return;
    }

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      // Try refreshing the session token first to ensure it's valid
      await refreshSession();

      const base64File = await fileToBase64(file);
      console.log("Preparing to submit degree issuance");
      console.log(
        `File size: ${(file.size / 1024).toFixed(2)}KB, Base64 length: ${
          base64File.length
        }`
      );

      const result = await issueMutation.mutateAsync({
        individualId,
        base64File,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(`Degree issued successfully! Document ID: ${result.docId}`);
      setIndividualId("");
      setFile(null);
    } catch (error: any) {
      console.error("Degree issuance failed:", error);

      let errorMessage = error.message || "Failed to issue degree";
      if (errorMessage.includes("payload") || error.message.includes("413")) {
        errorMessage =
          "File is too large for the server to process. Please use a smaller file.";
      }

      setLocalError(errorMessage);
    } finally {
      setIsUploading(false);
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
          mb="md"
        />
        <Text size="xs" color="dimmed" mb="xl">
          Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB. Only PDF files
          are accepted.
        </Text>

        {isUploading && (
          <>
            <Text size="sm" mb="xs">
              Uploading document...
            </Text>
            <Progress
              value={uploadProgress}
              mb="md"
              color={uploadProgress === 100 ? "green" : "blue"}
              striped={uploadProgress < 100}
              animated={uploadProgress < 100}
            />
          </>
        )}

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
        <Button
          type="submit"
          loading={issueMutation.isPending || isUploading}
          disabled={issueMutation.isPending || isUploading}
          fullWidth
        >
          Issue Degree
        </Button>
      </form>
    </Container>
  );
}
