import { VerificationResult } from '@/api/credentials/credential.models';
import { useVerifyCredentialMutation } from '@/api/credentials/credential.mutations';
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
import React, { useState } from 'react';

export default function VerifyCredential() {
  const theme = useMantineTheme();
  const { isDarkMode } = useTheme();
  const [file, setFile] = useState<FileWithPath | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { mutateAsync: verifyCredential, isPending: isVerifying } = useVerifyCredentialMutation();

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
          message: 'Please upload a credential document to verify',
          color: 'red',
        });
        return;
      }

      setFormSubmitted(true);

      // Convert file to base64
      const base64File = await readFileAsBase64(file);

      try {
        const result = await verifyCredential({ email: values.email, base64File });
        setResult(result);

        setFormSubmitted(false);

        if (result.verified) {
          notifications.show({
            title: 'Verification Successful',
            message: 'The credential is authentic and verified on the blockchain.',
            color: 'green',
            icon: <IconCheck size={16} />,
          });
        } else {
          notifications.show({
            title: 'Verification Failed',
            message: result.message || 'Credential could not be verified.',
            color: 'orange',
            icon: <IconAlertCircle size={16} />,
          });
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setFormSubmitted(false);

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
            message: error.message || 'An error occurred while verifying the credential.',
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
        message: 'Error reading the credential file. Please try again with a valid file.',
        color: 'red',
      });
    }
  };

  const handleDrop = (files: FileWithPath[]) => {
    setFile(files[0]);
  };

  const handleCopyDocId = () => {
    if (result?.credentialId) {
      navigator.clipboard.writeText(result.credentialId);
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
          description="Enter the credential holder's email address"
          placeholder="holder@example.com"
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
            Credential Document
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

    // Get credential type for display
    const credentialType = result.details?.type || 'credential';
    // Get credential title with appropriate fallback
    const credentialTitle = result.details?.title || 'Credential';

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
                {credentialTitle}
                {result.details?.attributes?.fieldOfStudy &&
                  ` in ${result.details.attributes.fieldOfStudy}`}
              </Title>
              <Text c="dimmed" size="sm">
                {result.details?.issuer || 'Unknown Issuer'}
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

          <Tabs.Panel value="details">{renderCredentialDetailsTab()}</Tabs.Panel>

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
        holder's email is correct.
      </Text>

      <Group mt="xl">
        <Button variant="white" size="md" onClick={resetForm}>
          Try Again
        </Button>
      </Group>
    </Alert>
  );

  const renderCredentialDetailsTab = () => {
    if (!result?.details) return null;

    // Extract attributes for display
    const attributes = result.details.attributes || {};
    const credentialType = result.details.type || 'credential';
    const graduationDate =
      attributes.graduationDate ||
      attributes.achievementDate ||
      result.details.issuedAt ||
      'Not specified';

    // Filter for additional attributes to display
    const additionalAttributes = Object.entries(attributes).filter(
      ([key]) =>
        !['fieldOfStudy', 'honors', 'holderId', 'graduationDate', 'achievementDate'].includes(key),
    );

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
                <Text fw={700}>Holder Information</Text>
              </Group>
              <Divider mb="sm" />

              <Box>
                <Grid gutter="sm">
                  <Grid.Col span={4}>
                    <Text size="sm" fw={600}>
                      Recipient:
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text size="sm">{result.details.holderName}</Text>
                  </Grid.Col>

                  {attributes.holderId && (
                    <>
                      <Grid.Col span={4}>
                        <Text size="sm" fw={600}>
                          Holder ID:
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <Text size="sm">{attributes.holderId}</Text>
                      </Grid.Col>
                    </>
                  )}
                </Grid>
              </Box>
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
                <Text fw={700}>Credential Information</Text>
              </Group>
              <Divider mb="sm" />

              <Box>
                <Grid gutter="sm">
                  <Grid.Col span={4}>
                    <Text size="sm" fw={600}>
                      Credential:
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text size="sm">{result.details.title}</Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text size="sm" fw={600}>
                      Type:
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text size="sm" tt="capitalize">
                      {credentialType}
                    </Text>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Text size="sm" fw={600}>
                      Issuance Date:
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Text size="sm">{graduationDate}</Text>
                  </Grid.Col>

                  {attributes.fieldOfStudy && (
                    <>
                      <Grid.Col span={4}>
                        <Text size="sm" fw={600}>
                          Field of Study:
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <Text size="sm">{attributes.fieldOfStudy}</Text>
                      </Grid.Col>
                    </>
                  )}

                  {attributes.honors && (
                    <>
                      <Grid.Col span={4}>
                        <Text size="sm" fw={600}>
                          Honors:
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <Badge color="blue" size="sm">
                          {attributes.honors}
                        </Badge>
                      </Grid.Col>
                    </>
                  )}

                  {/* Render additional attributes dynamically */}
                  {additionalAttributes.map(([key, value]) => (
                    <React.Fragment key={key}>
                      <Grid.Col span={4}>
                        <Text size="sm" fw={600} tt="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={8}>
                        <Text size="sm">{String(value)}</Text>
                      </Grid.Col>
                    </React.Fragment>
                  ))}
                </Grid>
              </Box>
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

              {result.details?.issuerLogoUrl && (
                <Box>
                  <img
                    src={result.details.issuerLogoUrl}
                    alt="Issuer Logo"
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

              {result.details?.issuerId && (
                <Badge color="blue" size="md" radius="sm">
                  Issuer ID: {result.details.issuerId}
                </Badge>
              )}

              <Text size="sm" c={isDarkMode ? 'gray.4' : 'gray.7'} ta="center">
                This {credentialType} has been cryptographically verified and matches the certified
                record stored on the blockchain.
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    );
  };

  const renderVerificationDataTab = () => {
    if (!result?.credentialId) return null;

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
                    <Group align="flex-start" wrap="nowrap">
                      <Text size="sm" fw={600} w={90} maw={90}>
                        Document ID:
                      </Text>
                      <Stack gap={0} style={{ flex: 1 }}>
                        <Group gap="xs" style={{ flexWrap: 'nowrap' }}>
                          <Text
                            size="sm"
                            ff="monospace"
                            style={{
                              wordBreak: 'keep-all',
                              overflowWrap: 'anywhere',
                              whiteSpace: 'pre-wrap',
                              flex: 1,
                            }}
                          >
                            {result.credentialId}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={handleCopyDocId}
                            style={{ flexShrink: 0 }}
                          >
                            <IconCopy size={14} />
                          </ActionIcon>
                        </Group>
                        <Text size="xs" c="dimmed">
                          Unique identifier for this document on the blockchain
                        </Text>
                      </Stack>
                    </Group>

                    <Group align="flex-start" wrap="nowrap">
                      <Text size="sm" fw={600} w={90} maw={90}>
                        Verified On:
                      </Text>
                      <Stack gap={0} style={{ flex: 1 }}>
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

                    {result.details?.ledgerTimestamp && (
                      <Group align="flex-start" wrap="nowrap">
                        <Text size="sm" fw={600} w={90} maw={90}>
                          Issued On:
                        </Text>
                        <Stack gap={0} style={{ flex: 1 }}>
                          <Text size="sm">{result.details.ledgerTimestamp}</Text>
                          <Text size="xs" c="dimmed">
                            Blockchain record timestamp
                          </Text>
                        </Stack>
                      </Group>
                    )}
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
                        <Text size="sm">It was genuinely issued by the claimed organization</Text>
                      </Group>
                      <Group gap="xs">
                        <ThemeIcon size="xs" radius="xl" color="green" variant="filled">
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm">The document belongs to the specified holder</Text>
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
    <Container size="xl" py="xl">
      {!result && renderVerificationForm()}
      {result && result.verified && renderSuccessResult()}
      {result && !result.verified && renderFailedResult()}
    </Container>
  );
}
