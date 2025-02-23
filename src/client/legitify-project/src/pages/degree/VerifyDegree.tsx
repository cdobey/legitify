import {
  Alert,
  Button,
  Card,
  Container,
  FileInput,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import {
  getUserDegrees,
  requestAccess,
  searchUsers,
  verifyDocument,
} from "../../services/degreeService";
import { hashFile } from "../../utils/fileUtils";

interface User {
  uid: string;
  email: string;
  username: string;
}

interface Degree {
  docId: string;
  status: string;
  issueDate: string;
}

export default function VerifyDegree() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDegrees, setUserDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);
  const [directUserId, setDirectUserId] = useState("");
  const [directFile, setDirectFile] = useState<File | null>(null);

  const handleVerify = async () => {
    if (!selectedFile || !selectedUser) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const fileHash = await hashFile(selectedFile);
      const result = await verifyDocument(selectedUser.uid, fileHash);
      setVerificationResult({
        verified: result.verified,
        message: result.verified
          ? "Document verified successfully!"
          : "Document verification failed. Hash doesn't match.",
      });
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectVerify = async () => {
    if (!directFile || !directUserId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const fileHash = await hashFile(directFile);
      const result = await verifyDocument(directUserId, fileHash);
      setVerificationResult({
        verified: result.verified,
        message: result.message,
      });
    } catch (err: any) {
      setError(err.message || "Direct verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError("");
      const user = await searchUsers(searchEmail);
      setSelectedUser(user);
      const degrees = await getUserDegrees(user.uid);
      setUserDegrees(degrees);
    } catch (err: any) {
      setError(err.message || "Failed to find user");
      setSelectedUser(null);
      setUserDegrees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (docId: string) => {
    try {
      setLoading(true);
      setError("");
      await requestAccess(docId);
      setSuccess(`Access requested for document ${docId}`);
    } catch (err: any) {
      setError(err.message || "Failed to request access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Verify Degrees
      </Title>

      <Card shadow="sm" p="lg" mb="xl">
        <Title order={3} size="h4" mb="md">
          Direct Verification
        </Title>
        <Stack>
          <TextInput
            label="Individual ID"
            placeholder="Enter user ID"
            value={directUserId}
            onChange={(e) => setDirectUserId(e.currentTarget.value)}
          />
          <FileInput
            label="Upload Document"
            placeholder="Choose file"
            accept="application/pdf"
            value={directFile}
            onChange={setDirectFile}
          />
          <Button onClick={handleDirectVerify} loading={loading}>
            Verify Document
          </Button>
        </Stack>
      </Card>

      <Card shadow="sm" p="lg" mb="xl">
        <Title order={3} size="h4" mb="md">
          Search for Individual
        </Title>
        <Group align="flex-end">
          <TextInput
            label="Email Address"
            placeholder="user@example.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </Group>
      </Card>

      {selectedUser && (
        <Card shadow="sm" p="lg" mb="xl">
          <Title order={3} size="h4" mb="md">
            Verify Document
          </Title>
          <Stack>
            <Text>Selected User: {selectedUser.email}</Text>
            <FileInput
              label="Upload Document"
              placeholder="Choose file"
              accept="application/pdf"
              value={selectedFile}
              onChange={setSelectedFile}
            />
            <Button onClick={handleVerify} loading={loading}>
              Verify Document
            </Button>
          </Stack>
        </Card>
      )}

      {verificationResult && (
        <Alert color={verificationResult.verified ? "green" : "red"} mb="xl">
          {verificationResult.message}
        </Alert>
      )}

      {error && (
        <Alert color="red" mb="xl">
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="green" mb="xl">
          {success}
        </Alert>
      )}

      {selectedUser && userDegrees.length > 0 && (
        <Card shadow="sm" p="lg">
          <Title order={3} size="h4" mb="md">
            Available Degrees
          </Title>
          <Stack>
            {userDegrees.map((degree) => (
              <Card key={degree.docId} shadow="sm" p="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text>Document ID: {degree.docId}</Text>
                    <Text size="sm" color="dimmed">
                      Status: {degree.status}
                    </Text>
                    <Text size="sm" color="dimmed">
                      Issued: {new Date(degree.issueDate).toLocaleDateString()}
                    </Text>
                  </div>
                  <Button
                    onClick={() => handleRequestAccess(degree.docId)}
                    disabled={loading}
                  >
                    Request Access
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        </Card>
      )}
    </Container>
  );
}
