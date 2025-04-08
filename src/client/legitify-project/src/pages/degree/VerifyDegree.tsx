import { VerificationResult } from '@/api/degrees/degree.models';
import { useVerifyDegreeMutation } from '@/api/degrees/degree.mutations';
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
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCertificate,
  IconCheck,
  IconFileUpload,
  IconMail,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function VerifyDegree() {
  const theme = useMantineTheme();
  const [formData, setFormData] = useState({
    email: '',
    document: null as File | null,
  });
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { mutateAsync: verifyDegree, isPending: isVerifying } = useVerifyDegreeMutation();

  const handleVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email.trim() || !formData.document) return;

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64File = (reader.result as string).split(',')[1];

        const verificationResult = await verifyDegree({
          email: formData.email,
          base64File: base64File,
        });

        setResult({
          verified: verificationResult.verified,
          message: verificationResult.message,
          details: verificationResult.details,
        });
      };

      reader.readAsDataURL(formData.document);
    } catch (error: any) {
      notifications.show({
        title: 'Verification Failed',
        message: error.message || 'Failed to verify document',
        color: 'red',
      });

      setResult({
        verified: false,
        message: error.message || 'Failed to verify document',
      });
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Group justify="center">
          <IconCertificate size={40} color="var(--primary-blue)" />
          <Title order={2}>Verify Degree</Title>
        </Group>

        <form onSubmit={handleVerification}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="Email Address"
                placeholder="Enter the graduate's email address"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                leftSection={<IconMail size={16} />}
                required
              />

              <FileInput
                label="Degree Document"
                placeholder="Upload the degree document"
                accept="application/pdf"
                leftSection={<IconFileUpload size={16} />}
                value={formData.document}
                onChange={file => setFormData({ ...formData, document: file })}
                required
              />

              <Button
                type="submit"
                loading={isVerifying}
                leftSection={<IconSearch size={18} />}
                disabled={!formData.email.trim() || !formData.document}
              >
                Verify Document
              </Button>

              {result && !isVerifying && (
                <Alert
                  icon={result.verified ? <IconCheck size={16} /> : <IconX size={16} />}
                  color={result.verified ? 'green' : 'red'}
                  title={result.verified ? 'Verified' : 'Not Verified'}
                >
                  <Text mb={result.details ? 'md' : 0}>{result.message}</Text>

                  {result.details && (
                    <Stack gap="xs" mt="sm">
                      <Text size="sm" fw={500}>
                        Document Details:
                      </Text>
                      <Text size="sm">Student: {result.details.studentName}</Text>
                      <Text size="sm">University: {result.details.university}</Text>
                      <Text size="sm">Degree: {result.details.degreeTitle}</Text>
                      <Text size="sm">Graduation Date: {result.details.graduationDate}</Text>
                    </Stack>
                  )}
                </Alert>
              )}
            </Stack>
          </Card>
        </form>
      </Stack>
    </Container>
  );
}
