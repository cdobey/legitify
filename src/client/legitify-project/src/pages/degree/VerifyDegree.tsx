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
import { User, VerificationResult } from "../../api/degrees/degree.models";
import {
  useRequestAccess,
  useVerifyDegree,
} from "../../api/degrees/degree.queries";
import { useSearchUser, useUserDegrees } from "../../api/users/user.queries";
import { fileToBase64 } from "../../utils/fileUtils";

export default function VerifyDegree() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directUserId, setDirectUserId] = useState("");
  const [directFile, setDirectFile] = useState<File | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  const verifyMutation = useVerifyDegree();
  const requestAccessMutation = useRequestAccess();
  const searchUserMutation = useSearchUser();
  const { data: userDegrees, refetch: refetchDegrees } = useUserDegrees(
    selectedUser?.uid ?? "",
    {
      enabled: !!selectedUser,
    }
  );

  const handleVerify = async () => {
    if (!selectedFile || !selectedUser) return;

    try {
      const base64File = await fileToBase64(selectedFile);
      const result = await verifyMutation.mutateAsync({
        individualId: selectedUser.uid,
        base64File,
      });
      setVerificationResult(result);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDirectVerify = async () => {
    if (!directFile || !directUserId) return;

    try {
      const base64File = await fileToBase64(directFile);
      const result = await verifyMutation.mutateAsync({
        individualId: directUserId,
        base64File,
      });
      setVerificationResult(result);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSearch = async () => {
    try {
      const user = await searchUserMutation.mutateAsync(searchEmail);
      setSelectedUser(user);
      refetchDegrees();
    } catch (error) {
      // Error handled by mutation
      setSelectedUser(null);
    }
  };

  const handleRequestAccess = async (docId: string) => {
    await requestAccessMutation.mutateAsync(docId);
  };

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Verify Degrees
      </Title>

      {/* Direct Verification Card */}
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
          <Button
            onClick={handleDirectVerify}
            loading={verifyMutation.isPending} // Changed from isLoading to isPending
          >
            Verify Document
          </Button>
        </Stack>
      </Card>

      {/* Search Card */}
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
          <Button onClick={handleSearch} loading={searchUserMutation.isPending}>
            Search
          </Button>
        </Group>
      </Card>

      {/* Verification Results */}
      {verificationResult && (
        <Alert color={verificationResult.verified ? "green" : "red"} mb="xl">
          {verificationResult.message}
        </Alert>
      )}

      {/* Error Messages */}
      {(verifyMutation.error ||
        searchUserMutation.error ||
        requestAccessMutation.error) && (
        <Alert color="red" mb="xl">
          {
            (
              (verifyMutation.error ||
                searchUserMutation.error ||
                requestAccessMutation.error) as Error
            ).message
          }
        </Alert>
      )}

      {/* Available Degrees */}
      {selectedUser && userDegrees?.length > 0 && (
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
                    disabled={requestAccessMutation.isPending} // Changed from isLoading to isPending
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
