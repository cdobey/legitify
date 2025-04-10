import { VerificationResult } from '@/api/degrees/degree.models';
import { useVerifyDegreeMutation } from '@/api/degrees/degree.mutations';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, FileWithPath, PDF_MIME_TYPE } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconCloudUpload,
  IconDownload,
  IconFile,
  IconMail,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function VerifyDegree() {
  const theme = useMantineTheme();
  const { isDarkMode } = useTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { mutateAsync: verifyDegree, isPending: isVerifying } = useVerifyDegreeMutation();

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: value => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
    validateInputOnBlur: true,
    validateInputOnChange: false,
  });

  const [emailTouched, setEmailTouched] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleVerification = async (values: { email: string }) => {
    setFormSubmitted(true);
    if (!values.email.trim() || !file) return;

    try {
      setResult(null);
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64File = (reader.result as string).split(',')[1];
          const verificationResult = await verifyDegree({
            email: values.email,
            base64File: base64File,
          });

          setResult(verificationResult);
        } catch (error: any) {
          handleError(error);
        }
      };

      reader.onerror = () => {
        handleError(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      handleError(error);
    }
  };

  const handleError = (error: any) => {
    notifications.show({
      title: 'Verification Failed',
      message: error.message || 'Failed to verify document',
      color: 'red',
      icon: <IconX size={16} />,
    });

    setResult({
      verified: false,
      message: error.message || 'Failed to verify document',
    });
  };

  const handleDrop = (files: FileWithPath[]) => {
    setFile(files[0]);
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg" ta="center">
        Verify Degree Document
      </Title>
      <Paper p="md" radius="md" withBorder mb="lg">
        <Text size="sm" c="dimmed" mb="md">
          Upload a PDF of the degree document and provide the email address of the graduate to
          verify the authenticity of the document.
        </Text>
      </Paper>

      <form onSubmit={form.onSubmit(handleVerification)}>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <TextInput
              label="Email Address"
              description="Enter the graduate's email address"
              placeholder="graduate@example.com"
              {...form.getInputProps('email')}
              onFocus={() => setEmailTouched(true)}
              error={emailTouched || formSubmitted ? form.getInputProps('email').error : null}
              leftSection={<IconMail size={16} />}
              required
            />

            <Stack gap="xs">
              <Text fw={500} size="sm">
                Degree Document
              </Text>
              <Dropzone
                onDrop={handleDrop}
                maxSize={5 * 1024 * 1024}
                accept={PDF_MIME_TYPE}
                multiple={false}
                loading={isVerifying}
                style={{
                  border: `2px dashed ${isDarkMode ? theme.colors.dark[3] : theme.colors.gray[4]}`,
                  backgroundColor: isDarkMode ? theme.colors.dark[7] : theme.colors.gray[0],
                  borderRadius: theme.radius.md,
                  padding: '20px',
                  cursor: 'pointer',
                }}
              >
                <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }}>
                  <Stack align="center" gap="xs">
                    <Dropzone.Accept>
                      <IconDownload
                        size={30}
                        color={theme.colors[theme.primaryColor][6]}
                        stroke={1.5}
                      />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <IconX size={30} color={theme.colors.red[6]} stroke={1.5} />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <IconCloudUpload
                        size={30}
                        color={isDarkMode ? theme.colors.dark[0] : theme.black}
                        stroke={1.5}
                      />
                    </Dropzone.Idle>
                    {!file && (
                      <>
                        <Text size="lg" ta="center" fw={500} mt="xs">
                          Drop your PDF here
                        </Text>
                        <Text size="sm" c="dimmed" ta="center" mt={5}>
                          or click to browse
                        </Text>
                      </>
                    )}
                    {file && (
                      <Text size="lg" ta="center" fw={500} mt="xs">
                        Ready to verify
                      </Text>
                    )}
                  </Stack>
                </Group>
              </Dropzone>
              {file && (
                <Paper
                  withBorder
                  p="xs"
                  bg={isDarkMode ? theme.colors.dark[6] : theme.colors.gray[0]}
                >
                  <Group gap="xs">
                    <IconFile size={16} />
                    <Text size="sm" style={{ flex: 1 }}>
                      {file.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                </Paper>
              )}
            </Stack>

            <Button
              type="submit"
              loading={isVerifying}
              leftSection={isVerifying ? <Loader size="xs" /> : <IconSearch size={18} />}
              disabled={!form.values.email.trim() || !file}
              mt="md"
              fullWidth
            >
              {isVerifying ? 'Verifying...' : 'Verify Document'}
            </Button>

            {result && !isVerifying && (
              <Alert
                icon={result.verified ? <IconCheck size={20} /> : <IconX size={20} />}
                color={result.verified ? 'green' : 'red'}
                title={result.verified ? 'Document Verified' : 'Verification Failed'}
                variant="filled"
              >
                <Text mb={result.details ? 'md' : 0} fw={500}>
                  {result.message}
                </Text>

                {result.details && (
                  <Card mt="md" p="sm" withBorder bg={isDarkMode ? '#1a2318' : '#f0f9f0'}>
                    <Title order={5} mb="sm">
                      Document Details:
                    </Title>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Student:
                        </Text>
                        <Text size="sm">{result.details.studentName}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          University:
                        </Text>
                        <Text size="sm">{result.details.university}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Degree:
                        </Text>
                        <Text size="sm">{result.details.degreeTitle}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Graduation Date:
                        </Text>
                        <Text size="sm">{result.details.graduationDate}</Text>
                      </Group>
                    </Stack>
                  </Card>
                )}
              </Alert>
            )}
          </Stack>
        </Card>
      </form>
    </Container>
  );
}
