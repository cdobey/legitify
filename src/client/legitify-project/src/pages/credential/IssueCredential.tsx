import { useIssueCredentialMutation } from '@/api/credentials/credential.mutations';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fileToBase64 } from '@/utils/fileUtils';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconBookUpload,
  IconBriefcase,
  IconCalendarEvent,
  IconCertificate,
  IconCheck,
  IconCloudUpload,
  IconFileUpload,
  IconInfoCircle,
  IconPlus,
  IconSchool,
  IconTrash,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyIssuersQuery } from '../../api/issuers/issuer.queries';

// Reduced to 3MB for safer uploads with base64 encoding (which increases size by ~33%)
const MAX_FILE_SIZE = 3 * 1024 * 1024;

// Local storage key for custom attribute names
const CUSTOM_ATTRIBUTE_KEYS_STORAGE_KEY = 'legitify-custom-attribute-keys';

interface CredentialFormData {
  email: string;
  file: File | null;
  title: string;
  description: string;
  expirationDate: Date | null;
  type: string;
  holderIdentifier?: string;
  programDuration?: string;
  grade?: number | '';
  honors?: string;
  dynamicAttributes: { key: string; value: string }[];
  issuerOrgId: string | null;
}

const loadAttributeKeys = (): string[] => {
  try {
    const storedKeys = localStorage.getItem(CUSTOM_ATTRIBUTE_KEYS_STORAGE_KEY);
    if (storedKeys) {
      const keys = JSON.parse(storedKeys);
      return Array.isArray(keys) ? keys.filter(key => typeof key === 'string') : [];
    }
  } catch (error) {
    console.error('Failed to load custom attribute keys from local storage:', error);
  }
  return [];
};

const saveAttributeKeys = (keys: string[]) => {
  try {
    const uniqueNonEmptyKeys = [...new Set(keys.filter(key => key.trim() !== ''))];
    localStorage.setItem(CUSTOM_ATTRIBUTE_KEYS_STORAGE_KEY, JSON.stringify(uniqueNonEmptyKeys));
  } catch (error) {
    console.error('Failed to save custom attribute keys to local storage:', error);
  }
};

export default function IssueCredential() {
  const initialKeys = loadAttributeKeys();
  const initialDynamicAttributes = [
    ...initialKeys.map(key => ({ key, value: '' })),
    { key: '', value: '' },
  ];

  const [formData, setFormData] = useState<CredentialFormData>({
    email: '',
    file: null,
    title: '',
    description: '',
    expirationDate: null,
    type: '',
    holderIdentifier: '',
    programDuration: '',
    grade: '',
    honors: '',
    dynamicAttributes: initialDynamicAttributes,
    issuerOrgId: null,
  });

  const [success, setSuccess] = useState('');
  const [issuedCredentialId, setIssuedCredentialId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [highestCompletedStep, setHighestCompletedStep] = useState(-1);

  const { isDarkMode } = useTheme();
  const theme = useMantineTheme();
  const { refreshSession } = useAuth();
  const issueMutation = useIssueCredentialMutation();

  const {
    data: issuers = [],
    isLoading: isLoadingIssuers,
    error: issuersError,
  } = useMyIssuersQuery();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateStep1 = () => {
    return !!formData.issuerOrgId && !!formData.email;
  };

  const validateStep2 = () => {
    const requiredFieldsValid = !!formData.title && !!formData.description && !!formData.type;

    const dynamicAttributesValid = formData.dynamicAttributes.every(
      attr => (attr.key === '' && attr.value === '') || (attr.key !== '' && attr.value !== ''),
    );

    const gradeValid =
      formData.grade === '' || (typeof formData.grade === 'number' && formData.grade >= 0);

    return requiredFieldsValid && dynamicAttributesValid && gradeValid;
  };

  const handleFileChange = (file: File | null) => {
    setLocalError(null);
    if (!file) {
      setFormData({ ...formData, file: null });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError(
        `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Current file is ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB`,
      );
      setFormData({ ...formData, file: null });
      return;
    }

    if (file.type !== 'application/pdf') {
      setLocalError('Only PDF files are accepted');
      setFormData({ ...formData, file: null });
      return;
    }

    setFormData({ ...formData, file });
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const newAttributes = [...formData.dynamicAttributes];
    newAttributes[index][field] = value;
    setFormData({ ...formData, dynamicAttributes: newAttributes });
  };

  const addAttribute = () => {
    setFormData({
      ...formData,
      dynamicAttributes: [...formData.dynamicAttributes, { key: '', value: '' }],
    });
  };

  const removeAttribute = (index: number) => {
    const newAttributes = formData.dynamicAttributes.filter((_, i) => i !== index);
    const finalAttributes = newAttributes.length === 0 ? [{ key: '', value: '' }] : newAttributes;
    setFormData({ ...formData, dynamicAttributes: finalAttributes });

    const currentKeys = finalAttributes.map(attr => attr.key);
    saveAttributeKeys(currentKeys);
  };

  const nextStep = () => {
    if (activeStep === 0 && !validateStep1()) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please select an issuer and enter holder email',
        color: 'orange',
      });
      return;
    }

    if (activeStep === 1 && !validateStep2()) {
      notifications.show({
        title: 'Missing Information',
        message:
          'Please fill all required credential information fields (Title, Type, Description) and ensure attributes have both key and value if one is entered.',
        color: 'orange',
      });
      return;
    }

    setActiveStep(current => {
      const next = current + 1;
      setHighestCompletedStep(current);
      return next;
    });
  };

  const prevStep = () => {
    setActiveStep(current => current - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess('');
    setIssuedCredentialId(null);
    setIsUploading(true);
    setUploadProgress(0);

    if (
      !formData.file ||
      !formData.email ||
      !formData.title ||
      !formData.description ||
      !formData.issuerOrgId ||
      !formData.type
    ) {
      setLocalError('Please fill in all required fields and select an issuer');
      setIsUploading(false);
      return;
    }

    const currentKeysToSave = formData.dynamicAttributes.map(attr => attr.key);
    saveAttributeKeys(currentKeysToSave);

    const combinedAttributes: Record<string, any> = {};

    if (formData.holderIdentifier) combinedAttributes.holderIdentifier = formData.holderIdentifier;
    if (formData.programDuration) combinedAttributes.programDuration = formData.programDuration;
    if (formData.grade !== '') combinedAttributes.grade = formData.grade;
    if (formData.honors) combinedAttributes.honors = formData.honors;

    formData.dynamicAttributes.forEach(attr => {
      const key = attr.key.trim();
      const value = attr.value.trim();
      if (key !== '' && value !== '') {
        combinedAttributes[key] = value;
      }
    });

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      await refreshSession();
      const base64File = await fileToBase64(formData.file);

      const result = await issueMutation.mutateAsync({
        email: formData.email,
        base64File,
        title: formData.title,
        description: formData.description,
        expirationDate: formData.expirationDate?.toISOString(),
        type: formData.type,
        attributes: combinedAttributes,
        issuerOrgId: formData.issuerOrgId,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      notifications.show({
        title: 'Success!',
        message: `Credential issued with ID: ${result.docId}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setSuccess(`Credential issued successfully! Document ID: ${result.docId}`);
      setIssuedCredentialId(result.docId);

      setActiveStep(4);
      setHighestCompletedStep(3);

      const reloadedKeys = loadAttributeKeys();
      const resetDynamicAttributes = [
        ...reloadedKeys.map(key => ({ key, value: '' })),
        { key: '', value: '' },
      ];
      setFormData({
        email: '',
        file: null,
        title: '',
        description: '',
        expirationDate: null,
        type: '',
        holderIdentifier: '',
        programDuration: '',
        grade: '',
        honors: '',
        dynamicAttributes: resetDynamicAttributes,
        issuerOrgId: null,
      });
    } catch (error: any) {
      console.error('Credential issuance failed:', error);
      setLocalError(error.message || 'Failed to issue credential');
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to issue credential',
        color: 'red',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStepperStyles = () => {
    return {
      stepBody: {
        cursor: 'pointer',
      },
      step: {
        transition: 'background-color 150ms ease',
      },
      stepIcon: {
        borderWidth: 2,
        background: isDarkMode ? theme.colors.dark[7] : theme.white,
      },
      stepCompletedIcon: {
        background: isDarkMode ? theme.colors.blue[7] : theme.colors.blue[6],
        borderRadius: '50%',
      },
      stepLabel: {
        fontSize: theme.fontSizes.sm,
        fontWeight: 500,
      },
      steps: {
        margin: '36px 0',
      },
    };
  };

  return (
    <Container size="lg" py="xl">
      <Paper shadow="md" p="xl" radius="md" withBorder className="fade-in-up">
        <Group mb="md" justify="space-between">
          <Group>
            <ThemeIcon
              size={42}
              radius="md"
              variant="light"
              color={isDarkMode ? 'blue' : 'indigo'}
              className="header-icon"
            >
              <IconCertificate size={24} />
            </ThemeIcon>
            <div>
              <Title order={2} className="header-title">
                Issue New Credential
              </Title>
              <Text size="sm" c="dimmed">
                Create a blockchain-verified credential certificate
              </Text>
            </div>
          </Group>

          {isUploading && (
            <Group>
              <Text size="sm" fw={500} style={{ minWidth: '100px' }}>
                {uploadProgress < 100 ? 'Uploading...' : 'Complete!'}
              </Text>
              <Progress
                value={uploadProgress}
                size="sm"
                w={200}
                color={uploadProgress === 100 ? 'green' : 'blue'}
                striped={uploadProgress < 100}
                animated={uploadProgress < 100}
              />
            </Group>
          )}
        </Group>

        <Divider mb="xl" />

        <form onSubmit={handleSubmit}>
          <Stepper
            active={activeStep}
            onStepClick={setActiveStep}
            allowNextStepsSelect={false}
            styles={getStepperStyles()}
            color={isDarkMode ? 'blue' : 'indigo'}
          >
            <Stepper.Step
              label="Holder & Issuer"
              description="Identify the parties"
              icon={<IconUser size={18} />}
              completedIcon={<IconCheck size={18} />}
              allowStepSelect={true}
            >
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Stack gap="lg">
                  <SimpleGrid cols={1}>
                    <Select
                      label="Issuing Organization"
                      description="Choose which organization is issuing this credential"
                      placeholder={isLoadingIssuers ? 'Loading issuers...' : 'Select an issuer'}
                      data={issuers.map(uni => ({ value: uni.id, label: uni.shorthand }))}
                      value={formData.issuerOrgId}
                      onChange={value => setFormData({ ...formData, issuerOrgId: value })}
                      required
                      disabled={isLoadingIssuers}
                      leftSection={<IconBriefcase size={16} />}
                      size="md"
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={1}>
                    <TextInput
                      label="Holder Email"
                      description="The email address of the credential recipient"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter holder's email address"
                      leftSection={<IconUser size={16} />}
                      size="md"
                    />
                  </SimpleGrid>

                  <Group justify="flex-end" mt="md">
                    <Button
                      onClick={nextStep}
                      disabled={!validateStep1()}
                      variant={isDarkMode ? 'filled' : 'gradient'}
                      gradient={{ from: '#2291d6', to: '#147cc4', deg: 35 }}
                    >
                      Next Step
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stepper.Step>

            <Stepper.Step
              label="Credential Details"
              description="Information about the credential"
              icon={<IconCertificate size={18} />}
              completedIcon={<IconCheck size={18} />}
              allowStepSelect={highestCompletedStep >= 0}
            >
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Required Information
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    label="Credential Title"
                    description="Full title of the credential"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Certified Cloud Practitioner"
                    leftSection={<IconCertificate size={16} />}
                    size="md"
                  />
                  <TextInput
                    label="Credential Type"
                    description="Category or type of the credential"
                    required
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    placeholder="e.g. Certification, Diploma, Badge"
                    leftSection={<IconInfoCircle size={16} />}
                    size="md"
                  />
                  <div></div>
                </SimpleGrid>
                <Textarea
                  label="Description"
                  description="Detailed description of the credential"
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the credential, scope, etc."
                  minRows={3}
                  size="md"
                  mt="lg"
                />

                <Divider label="Optional & Custom Information" labelPosition="center" my="xl" />
                <Stack gap="lg">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    <DateInput
                      label="Expiration Date"
                      description="Date when credential expires (optional)"
                      value={formData.expirationDate}
                      onChange={date => setFormData({ ...formData, expirationDate: date })}
                      placeholder="Select expiration date"
                      leftSection={<IconCalendarEvent size={16} />}
                      size="md"
                      clearable={true}
                    />
                    <TextInput
                      label="Holder Identifier"
                      description="Issuer-specific ID for the holder (optional)"
                      value={formData.holderIdentifier}
                      onChange={e => setFormData({ ...formData, holderIdentifier: e.target.value })}
                      placeholder="e.g. Student ID, Employee ID"
                      leftSection={<IconUser size={16} />}
                      size="md"
                    />
                    <TextInput
                      label="Program Duration"
                      description="Length of program/course (optional)"
                      value={formData.programDuration}
                      onChange={e => setFormData({ ...formData, programDuration: e.target.value })}
                      placeholder="e.g. 4 years, 6 months"
                      size="md"
                    />
                    <NumberInput
                      label="Grade / GPA"
                      description="Overall grade or GPA (optional)"
                      value={formData.grade}
                      onChange={val =>
                        setFormData({ ...formData, grade: typeof val === 'string' ? '' : val })
                      }
                      placeholder="Enter grade or GPA"
                      min={0}
                      step={0.01}
                      decimalScale={2}
                      hideControls
                      error={
                        typeof formData.grade === 'number' && formData.grade < 0
                          ? 'Grade cannot be negative'
                          : null
                      }
                      size="md"
                    />
                    <TextInput
                      label="Honors / Distinctions"
                      description="Academic distinctions (optional)"
                      value={formData.honors}
                      onChange={e => setFormData({ ...formData, honors: e.target.value })}
                      placeholder="e.g. First Class Honors, Magna Cum Laude"
                      size="md"
                      style={{ gridColumn: '1 / -1' }}
                    />
                  </SimpleGrid>

                  {formData.dynamicAttributes.map((attr, index) => (
                    <Group key={index} grow align="flex-start" gap="xs">
                      <TextInput
                        placeholder="Attribute Name"
                        value={attr.key}
                        onChange={e => handleAttributeChange(index, 'key', e.target.value)}
                        size="sm"
                      />
                      <TextInput
                        placeholder="Attribute Value"
                        value={attr.value}
                        onChange={e => handleAttributeChange(index, 'value', e.target.value)}
                        size="sm"
                      />
                      <ActionIcon
                        color="red"
                        onClick={() => removeAttribute(index)}
                        disabled={
                          formData.dynamicAttributes.length === 1 &&
                          attr.key === '' &&
                          attr.value === ''
                        }
                        variant="light"
                        size="lg"
                        style={{ alignSelf: 'center', marginTop: '4px' }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                  <Button
                    leftSection={<IconPlus size={14} />}
                    onClick={addAttribute}
                    variant="light"
                    size="xs"
                    mt="xs"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Add Custom Attribute
                  </Button>
                </Stack>

                <Group justify="space-between" mt="xl">
                  <Button variant="default" onClick={prevStep}>
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep2()}
                    variant={isDarkMode ? 'filled' : 'gradient'}
                    gradient={{ from: '#2291d6', to: '#147cc4', deg: 35 }}
                  >
                    Next Step
                  </Button>
                </Group>
              </Card>
            </Stepper.Step>

            <Stepper.Step
              label="Document Upload"
              description="Upload credential document (PDF)"
              icon={<IconUpload size={18} />}
              completedIcon={<IconCheck size={18} />}
              allowStepSelect={highestCompletedStep >= 1}
            >
              <Card
                p="xl"
                radius="md"
                style={{
                  width: '100%',
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  backgroundColor: isDarkMode ? theme.colors.dark[6] : theme.colors.gray[0],
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  cursor: formData.file ? 'default' : 'pointer',
                }}
                className="document-upload-card"
                onClick={() => {
                  if (!formData.file) {
                    triggerFileUpload();
                  }
                }}
              >
                <Stack align="center" gap="md">
                  {!formData.file ? (
                    <>
                      <ThemeIcon
                        size={60}
                        radius={60}
                        color={isDarkMode ? 'blue' : 'indigo'}
                        variant="light"
                      >
                        <IconCloudUpload size={30} stroke={1.5} />
                      </ThemeIcon>

                      <div style={{ textAlign: 'center' }}>
                        <Text size="xl" fw={700} mb={5}>
                          Upload Credential Document
                        </Text>
                        <Text size="sm" c="dimmed">
                          Drag and drop your PDF file here or click to browse
                        </Text>
                        <Text size="xs" c="dimmed" mt={5}>
                          Maximum file size: 3MB
                        </Text>
                      </div>

                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        data-testid="file-input-hidden"
                      />

                      <Button
                        variant="outline"
                        leftSection={<IconFileUpload size={16} />}
                        onClick={e => {
                          e.stopPropagation();
                          triggerFileUpload();
                        }}
                      >
                        Select PDF file
                      </Button>
                    </>
                  ) : (
                    <>
                      <ThemeIcon size={60} radius={60} color="green" variant="light">
                        <IconCheck size={30} stroke={1.5} />
                      </ThemeIcon>

                      <div style={{ textAlign: 'center' }}>
                        <Text size="xl" fw={700} mb={5}>
                          File Selected
                        </Text>
                        <Text size="md" c="dimmed">
                          {formData.file.name}
                        </Text>
                        <Text size="sm" fw={500} c="green" mt={5}>
                          {(formData.file.size / 1024 / 1024).toFixed(2)}MB
                        </Text>
                        <Button
                          variant="subtle"
                          color="red"
                          mt="xs"
                          onClick={() => setFormData({ ...formData, file: null })}
                        >
                          Remove file
                        </Button>
                      </div>
                    </>
                  )}
                </Stack>
              </Card>

              {(issueMutation.error || localError) && (
                <Alert color="red" withCloseButton={false}>
                  {localError || (issueMutation.error as Error).message}
                </Alert>
              )}

              {success && (
                <Alert color="green" withCloseButton={false} icon={<IconCheck size={16} />}>
                  {success}
                </Alert>
              )}

              <Group justify="space-between" style={{ width: '100%' }} mt="md">
                <Button variant="default" onClick={prevStep}>
                  Back
                </Button>
                <Button
                  type="submit"
                  loading={issueMutation.isPending || isUploading}
                  disabled={
                    issueMutation.isPending || isUploading || !formData.file || !validateStep2()
                  }
                  color="green"
                  leftSection={<IconBookUpload size={16} />}
                >
                  Issue Credential
                </Button>
              </Group>
            </Stepper.Step>

            <Stepper.Completed>
              <Card shadow="sm" p="xl" radius="md" withBorder className="fade-in-up">
                <Stack align="center" gap="xl">
                  <ThemeIcon
                    size={80}
                    radius={80}
                    color="green"
                    variant="light"
                    style={{ transition: 'transform 0.5s ease', transform: 'scale(1.1)' }}
                  >
                    <IconCheck size={50} stroke={1.5} />
                  </ThemeIcon>

                  <div style={{ textAlign: 'center' }}>
                    <Title order={2} c="green" mb="md">
                      Success!
                    </Title>
                    <Text size="lg" fw={500} mb={5}>
                      Credential has been issued successfully
                    </Text>
                    <Text size="md" c="dimmed">
                      The credential certificate has been securely stored on the blockchain
                    </Text>

                    {issuedCredentialId && (
                      <Alert color="blue" variant="light" mt="md" mb="xl" radius="md">
                        <Text fw={500} mb={5}>
                          Document ID
                        </Text>
                        <Text size="sm" fw={700}>
                          {issuedCredentialId}
                        </Text>
                        <Text size="xs" c="dimmed" mt={8}>
                          This ID can be used to verify and access the credential certificate
                        </Text>
                      </Alert>
                    )}
                  </div>

                  <Group justify="center" mt="xl" gap="md">
                    <Button
                      component={Link}
                      to="/dashboard"
                      variant="light"
                      size="md"
                      leftSection={<IconSchool size={18} />}
                    >
                      Go to Dashboard
                    </Button>

                    <Button
                      variant={isDarkMode ? 'filled' : 'gradient'}
                      gradient={{ from: '#2291d6', to: '#147cc4', deg: 35 }}
                      size="md"
                      leftSection={<IconCertificate size={18} />}
                      onClick={() => {
                        setActiveStep(0);
                        setHighestCompletedStep(-1);
                        setIssuedCredentialId(null);
                        setSuccess('');
                        const reloadedKeys = loadAttributeKeys();
                        const resetDynamicAttributes = [
                          ...reloadedKeys.map(key => ({ key, value: '' })),
                          { key: '', value: '' },
                        ];
                        setFormData({
                          email: '',
                          file: null,
                          title: '',
                          description: '',
                          expirationDate: null,
                          type: '',
                          holderIdentifier: '',
                          programDuration: '',
                          grade: '',
                          honors: '',
                          dynamicAttributes: resetDynamicAttributes,
                          issuerOrgId: null,
                        });
                      }}
                    >
                      Issue Another Credential
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stepper.Completed>
          </Stepper>
        </form>
      </Paper>
    </Container>
  );
}
