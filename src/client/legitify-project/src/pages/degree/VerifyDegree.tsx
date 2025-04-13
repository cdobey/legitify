import { VerificationResult } from '@/api/degrees/degree.models';
import { useVerifyDegreeMutation } from '@/api/degrees/degree.mutations';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, FileWithPath, PDF_MIME_TYPE } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCertificate,
  IconCheck,
  IconCloudUpload,
  IconCopy,
  IconDatabase,
  IconDownload,
  IconFile,
  IconFileText,
  IconMail,
  IconSearch,
  IconShieldCheck,
  IconUser,
  IconWifiOff,
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
  const [activeTab, setActiveTab] = useState<string | null>('details');

  const readFileAsBase64 = (file: FileWithPath): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (values: { email: string }) => {
    try {
      if (!file) {
        notifications.show({
          title: 'Missing File',
          message: 'Please upload a certificate file to verify',
          color: 'red',
        });
        return;
      }

      // Set form as submitted to show verification is in progress
      setFormSubmitted(true);

      // Convert file to base64
      const base64File = await readFileAsBase64(file);

      try {
        // Attempt to verify the degree
        const result = await verifyDegree({ email: values.email, base64File });
        setResult(result);

        // If verification is successful, reset form submitted state
        setFormSubmitted(false);

        // Show success notification only if verification was successful
        if (result.verified) {
          notifications.show({
            title: 'Verification Successful',
            message: 'The certificate is authentic and verified on the blockchain.',
            color: 'green',
            icon: <IconCheck size={16} />,
          });
        } else {
          notifications.show({
            title: 'Verification Failed',
            message: result.message || 'Certificate could not be verified.',
            color: 'orange',
            icon: <IconAlertCircle size={16} />,
          });
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setFormSubmitted(false);

        // Handle network connectivity issues specially
        if (error.message?.includes('network') || !navigator.onLine) {
          notifications.show({
            title: 'Network Error',
            message:
              'Unable to connect to the verification server. You can try again when your connection is restored.',
            color: 'red',
            icon: <IconWifiOff size={16} />,
            autoClose: false,
          });
        } else {
          notifications.show({
            title: 'Verification Error',
            message: error.message || 'An error occurred while verifying the certificate.',
            color: 'red',
            icon: <IconAlertCircle size={16} />,
          });
        }
      }
    } catch (error) {
      console.error('File reading error:', error);
      setFormSubmitted(false);
      notifications.show({
        title: 'File Error',
        message: 'Error reading the certificate file. Please try again with a valid file.',
        color: 'red',
      });
    }
  };

  const handleDrop = (files: FileWithPath[]) => {
    setFile(files[0]);
  };

  const handleCopyDocId = () => {
    if (result?.docId) {
      navigator.clipboard.writeText(result.docId);
      notifications.show({
        title: 'ID Copied',
        message: 'Document ID copied to clipboard',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    form.reset();
    setEmailTouched(false);
    setFormSubmitted(false);
  };

  const renderVerificationForm = () => (
    <Card shadow="md" p="xl" radius="lg" withBorder className="verification-form-card">
      <Stack gap="md">
        <Title order={4} mb="xs">
          Enter Verification Details
        </Title>
        <TextInput
          label="Email Address"
          description="Enter the graduate's email address"
          placeholder="graduate@example.com"
          {...form.getInputProps('email')}
          onFocus={() => setEmailTouched(true)}
          error={emailTouched || formSubmitted ? form.getInputProps('email').error : null}
          leftSection={<IconMail size={16} />}
          required
          styles={{
            input: {
              height: 45,
            },
          }}
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
            styles={{
              root: {
                border: `2px dashed ${isDarkMode ? theme.colors.dark[3] : theme.colors.gray[4]}`,
                backgroundColor: isDarkMode ? theme.colors.dark[7] : theme.colors.gray[0],
                borderRadius: theme.radius.md,
                padding: '20px',
                cursor: 'pointer',
                minHeight: 120,
                transition: 'background-color 150ms ease, border-color 150ms ease',
                '&:hover': {
                  backgroundColor: isDarkMode ? theme.colors.dark[6] : theme.colors.gray[1],
                  borderColor: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[5],
                },
              },
            }}
          >
            <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }}>
              <Stack align="center" gap="xs">
                <Dropzone.Accept>
                  <IconDownload
                    size={35}
                    color={theme.colors[theme.primaryColor][6]}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={35} color={theme.colors.red[6]} stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconCloudUpload
                    size={35}
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
              bg={isDarkMode ? theme.colors.dark[6] : theme.white}
              radius="md"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Group gap="xs">
                <ThemeIcon size="sm" color="blue" variant="light" radius="xl">
                  <IconFile size={12} />
                </ThemeIcon>
                <Text size="sm" style={{ flex: 1 }}>
                  {file.name}
                </Text>
                <Text size="xs" c="dimmed">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </Text>
                <ActionIcon variant="light" color="red" size="sm" onClick={() => setFile(null)}>
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
          mt="md"
          fullWidth
          size="md"
          radius="md"
          onClick={() => form.onSubmit(handleSubmit)()}
          styles={{
            root: {
              height: 45,
            },
          }}
        >
          {isVerifying ? 'Verifying...' : 'Verify Document'}
        </Button>
      </Stack>
    </Card>
  );

  const renderSuccessResult = () => {
    if (!result?.verified) {
      return renderFailedResult();
    }

    return (
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="light"
              color={isDarkMode ? '#2ca6d3' : 'blue'}
            >
              <IconCertificate size={28} />
            </ThemeIcon>
            <div>
              <Title order={2}>
                {result.details?.degreeTitle || 'Academic Certificate'}
                {result.details?.fieldOfStudy && ` in ${result.details.fieldOfStudy}`}
              </Title>
              <Text c="dimmed" size="sm">
                {result.details?.university || 'Unknown Institution'}
              </Text>
            </div>
          </Group>
          <Group>
            <Badge
              size="md"
              radius="md"
              leftSection={<IconCheck size={16} />}
              color={isDarkMode ? '#15e2b5' : 'teal'}
              style={{
                backgroundColor: isDarkMode ? 'rgba(21, 226, 181, 0.15)' : undefined,
              }}
            >
              Blockchain Verified
            </Badge>
          </Group>
        </Group>

        <Divider size="sm" my="lg" />

        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
          <Tabs.List mb="lg">
            <Tabs.Tab value="details" leftSection={<IconCertificate size={18} />} fw={500}>
              Details
            </Tabs.Tab>
            <Tabs.Tab value="document" leftSection={<IconFileText size={18} />} fw={500}>
              Document
            </Tabs.Tab>
            <Tabs.Tab value="verification" leftSection={<IconDatabase size={18} />} fw={500}>
              Verification Info
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details">{renderDegreeDetailsTab()}</Tabs.Panel>

          <Tabs.Panel value="document">
            <Card shadow="sm" radius="md" padding="xl" mb="md" withBorder>
              {result.fileData ? (
                <Box py={5}>
                  <embed
                    src={`data:application/pdf;base64,${result.fileData}`}
                    type="application/pdf"
                    width="100%"
                    height="600px"
                    style={{ borderRadius: '8px', border: `1px solid ${theme.colors.gray[3]}` }}
                  />
                </Box>
              ) : (
                <Alert color="yellow" radius="md" title="No Document Available">
                  The original document file is not available.
                </Alert>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="verification">{renderVerificationDataTab()}</Tabs.Panel>
        </Tabs>

        <Group mt="xl" justify="center">
          <Button variant="default" onClick={resetForm}>
            Verify Another
          </Button>
        </Group>
      </Paper>
    );
  };

  const renderFailedResult = () => (
    <Alert
      icon={<IconX size={24} />}
      color="red"
      title="Verification Failed"
      variant="filled"
      radius="md"
      styles={{
        root: {
          padding: '20px',
        },
        title: {
          fontSize: '20px',
          marginBottom: '10px',
        },
        message: {
          fontSize: '16px',
        },
      }}
    >
      <Text fw={500} size="lg">
        {result?.message}
      </Text>
      <Text mt="sm" size="sm">
        The document could not be verified. Please ensure you have the correct document and that the
        graduate's email is correct.
      </Text>

      <Group mt="xl">
        <Button variant="white" size="md" onClick={resetForm}>
          Try Again
        </Button>
      </Group>
    </Alert>
  );

  const renderDegreeDetailsTab = () => {
    if (!result?.details) return null;
    return (
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            <Paper
              withBorder
              p="md"
              radius="md"
              style={{ backgroundColor: isDarkMode ? theme.colors.dark[7] : theme.white }}
            >
              <Group gap="xs" mb="xs">
                <ThemeIcon size="md" color="blue" radius="xl">
                  <IconUser size={16} />
                </ThemeIcon>
                <Text fw={700}>Student Information</Text>
              </Group>
              <Divider mb="sm" />
              <Stack gap="sm">
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    Recipient:
                  </Text>
                  <Text size="sm">{result.details.studentName}</Text>
                </Group>

                {result.details.studentId && (
                  <Group gap="xs">
                    <Text size="sm" fw={600} w={120}>
                      Student ID:
                    </Text>
                    <Text size="sm">{result.details.studentId}</Text>
                  </Group>
                )}
              </Stack>
            </Paper>

            <Paper
              withBorder
              p="md"
              radius="md"
              style={{ backgroundColor: isDarkMode ? theme.colors.dark[7] : theme.white }}
            >
              <Group gap="xs" mb="xs">
                <ThemeIcon size="md" color="blue" radius="xl">
                  <IconCertificate size={16} />
                </ThemeIcon>
                <Text fw={700}>Degree Information</Text>
              </Group>
              <Divider mb="sm" />
              <Stack gap="sm">
                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    Degree:
                  </Text>
                  <Text size="sm">{result.details.degreeTitle}</Text>
                </Group>

                <Group gap="xs">
                  <Text size="sm" fw={600} w={120}>
                    Graduation Date:
                  </Text>
                  <Text size="sm">{result.details.graduationDate}</Text>
                </Group>

                {result.details.fieldOfStudy && (
                  <Group gap="xs">
                    <Text size="sm" fw={600} w={120}>
                      Field of Study:
                    </Text>
                    <Text size="sm">{result.details.fieldOfStudy}</Text>
                  </Group>
                )}

                {result.details.honors && (
                  <Group gap="xs">
                    <Text size="sm" fw={600} w={120}>
                      Honors:
                    </Text>
                    <Badge color="blue" size="sm">
                      {result.details.honors}
                    </Badge>
                  </Group>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            withBorder
            radius="md"
            p="xl"
            bg={isDarkMode ? `rgba(25, 113, 194, 0.15)` : `rgba(231, 245, 255, 0.7)`}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Stack gap="md" align="center">
              <ThemeIcon size="xl" radius="xl" color="green">
                <IconShieldCheck size={30} />
              </ThemeIcon>

              {result.details?.universityLogoUrl && (
                <Box>
                  <img
                    src={result.details.universityLogoUrl}
                    alt="University Logo"
                    style={{
                      maxHeight: '60px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </Box>
              )}

              <Title order={3} ta="center" mt="sm" c={isDarkMode ? theme.white : theme.black}>
                Verified & Authentic
              </Title>

              {result.details?.universityId && (
                <Badge color="blue" size="md" radius="sm">
                  University ID: {result.details.universityId}
                </Badge>
              )}

              <Text size="sm" c={isDarkMode ? 'gray.4' : 'gray.7'} ta="center">
                This document has been cryptographically verified and matches the certified record
                stored on the blockchain.
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    );
  };

  const renderVerificationDataTab = () => {
    if (!result?.docId) return null;
    return (
      <Grid>
        <Grid.Col span={12}>
          <Paper
            withBorder
            p="lg"
            radius="md"
            style={{ backgroundColor: isDarkMode ? theme.colors.dark[7] : theme.white }}
          >
            <Stack gap="md">
              <Group gap="xs">
                <ThemeIcon size="md" color="blue" radius="xl">
                  <IconDatabase size={16} />
                </ThemeIcon>
                <Text fw={700}>Blockchain Verification Details</Text>
              </Group>
              <Divider />

              <Grid mt="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="md">
                    <Group align="flex-start">
                      <Text size="sm" fw={600} w={100}>
                        Document ID:
                      </Text>
                      <Stack gap={0}>
                        <Group gap="xs">
                          <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                            {result.docId}
                          </Text>
                          <ActionIcon variant="subtle" size="sm" onClick={handleCopyDocId}>
                            <IconCopy size={14} />
                          </ActionIcon>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Unique identifier for this document on the blockchain
                        </Text>
                      </Stack>
                    </Group>

                    <Group align="flex-start">
                      <Text size="sm" fw={600} w={100}>
                        Verified On:
                      </Text>
                      <Stack gap={0}>
                        <Text size="sm">
                          {new Date().toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Time of this verification
                        </Text>
                      </Stack>
                    </Group>
                  </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Card p="md" radius="md" bg={isDarkMode ? 'dark.6' : 'gray.0'} withBorder>
                    <Text size="sm" mb="md">
                      This document has been cryptographically verified using blockchain technology.
                      The verification process uses SHA-256 hashing to ensure that:
                    </Text>
                    <Stack gap="xs" ml="md">
                      <Group gap="xs">
                        <ThemeIcon size="xs" radius="xl" color="green" variant="filled">
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm">The document has not been altered since issuance</Text>
                      </Group>
                      <Group gap="xs">
                        <ThemeIcon size="xs" radius="xl" color="green" variant="filled">
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm">It was genuinely issued by the claimed institution</Text>
                      </Group>
                      <Group gap="xs">
                        <ThemeIcon size="xs" radius="xl" color="green" variant="filled">
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm">The document belongs to the specified graduate</Text>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    );
  };

  return (
    <Container size="lg" py="xl">
      {!result && renderVerificationForm()}
      {result && result.verified && renderSuccessResult()}
      {result && !result.verified && renderFailedResult()}
    </Container>
  );
}
