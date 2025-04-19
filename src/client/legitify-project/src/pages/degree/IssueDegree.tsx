import { useIssueDegreeeMutation } from '@/api/degrees/degree.mutations';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { fileToBase64 } from '@/utils/fileUtils';
import {
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
  IconSchool,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyUniversitiesQuery } from '../../api/universities/university.queries';

// Reduced to 3MB for safer uploads with base64 encoding (which increases size by ~33%)
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

interface DegreeFormData {
  email: string;
  file: File | null;
  degreeTitle: string;
  fieldOfStudy: string;
  graduationDate: Date | null;
  honors: string;
  studentId: string;
  programDuration: string;
  gpa: number | '';
  additionalNotes: string;
  universityId: string | null;
}

export default function IssueDegree() {
  const [formData, setFormData] = useState<DegreeFormData>({
    email: '',
    file: null,
    degreeTitle: '',
    fieldOfStudy: '',
    graduationDate: null,
    honors: '',
    studentId: '',
    programDuration: '',
    gpa: '',
    additionalNotes: '',
    universityId: null,
  });

  const [success, setSuccess] = useState('');
  const [issuedDegreeId, setIssuedDegreeId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [highestCompletedStep, setHighestCompletedStep] = useState(-1);

  const { isDarkMode } = useTheme();
  const theme = useMantineTheme();
  const { refreshSession } = useAuth();
  const issueMutation = useIssueDegreeeMutation();

  const {
    data: universities = [],
    isLoading: isLoadingUniversities,
    error: universitiesError,
  } = useMyUniversitiesQuery();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to trigger the hidden file input's click event
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Validation functions for each step
  const validateStep1 = () => {
    return !!formData.universityId && !!formData.email;
  };

  const validateStep2 = () => {
    return (
      !!formData.degreeTitle &&
      !!formData.fieldOfStudy &&
      !!formData.graduationDate &&
      !!formData.programDuration &&
      !!formData.studentId &&
      (typeof formData.gpa === 'number' || formData.gpa === '')
    );
  };

  const validateStep3 = () => {
    return !!formData.file;
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

  const nextStep = () => {
    if (activeStep === 0 && !validateStep1()) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please select a university and enter student email',
        color: 'orange',
      });
      return;
    }

    if (activeStep === 1 && !validateStep2()) {
      notifications.show({
        title: 'Missing Information',
        message: 'Please fill all required degree information fields',
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
    setIssuedDegreeId(null);
    setIsUploading(true);
    setUploadProgress(0);

    if (
      !formData.file ||
      !formData.email ||
      !formData.degreeTitle ||
      !formData.fieldOfStudy ||
      !formData.universityId
    ) {
      setLocalError('Please fill in all required fields and select a university');
      setIsUploading(false);
      return;
    }

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      await refreshSession();
      const base64File = await fileToBase64(formData.file);

      const result = await issueMutation.mutateAsync({
        email: formData.email,
        base64File,
        degreeTitle: formData.degreeTitle,
        fieldOfStudy: formData.fieldOfStudy,
        graduationDate: formData.graduationDate?.toISOString() || new Date().toISOString(),
        honors: formData.honors || '',
        studentId: formData.studentId || '',
        programDuration: formData.programDuration || '',
        gpa: Number(formData.gpa) || 0,
        additionalNotes: formData.additionalNotes || '',
        universityId: formData.universityId || '',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      notifications.show({
        title: 'Success!',
        message: `Degree issued with ID: ${result.docId}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setSuccess(`Degree issued successfully! Document ID: ${result.docId}`);
      setIssuedDegreeId(result.docId);

      // Set active step to 4 (success step)
      setActiveStep(4);
      setHighestCompletedStep(3);

      setFormData({
        email: '',
        file: null,
        degreeTitle: '',
        fieldOfStudy: '',
        graduationDate: null,
        honors: '',
        studentId: '',
        programDuration: '',
        gpa: '',
        additionalNotes: '',
        universityId: null,
      });
    } catch (error: any) {
      console.error('Degree issuance failed:', error);
      setLocalError(error.message || 'Failed to issue degree');
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to issue degree',
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
                Issue New Degree
              </Title>
              <Text size="sm" c="dimmed">
                Create a blockchain-verified degree certificate
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
              label="Student & University"
              description="Identify the parties"
              icon={<IconSchool size={18} />}
              completedIcon={<IconCheck size={18} />}
              allowStepSelect={true}
            >
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Stack gap="lg">
                  <SimpleGrid cols={1}>
                    <Select
                      label="Issuing University"
                      description="Choose which university is issuing this degree"
                      placeholder={
                        isLoadingUniversities ? 'Loading universities...' : 'Select a university'
                      }
                      data={universities.map(uni => ({ value: uni.id, label: uni.displayName }))}
                      value={formData.universityId}
                      onChange={value => setFormData({ ...formData, universityId: value })}
                      required
                      disabled={isLoadingUniversities}
                      leftSection={<IconSchool size={16} />}
                      size="md"
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={1}>
                    <TextInput
                      label="Student Email"
                      description="The email address of the degree recipient"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter student's email address"
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
              label="Degree Details"
              description="Academic information"
              icon={<IconCertificate size={18} />}
              completedIcon={<IconCheck size={18} />}
              allowStepSelect={highestCompletedStep >= 0}
            >
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <TextInput
                    label="Degree Title"
                    description="Full title of the academic degree"
                    required
                    value={formData.degreeTitle}
                    onChange={e => setFormData({ ...formData, degreeTitle: e.target.value })}
                    placeholder="e.g. Bachelor of Computer Science"
                    leftSection={<IconCertificate size={16} />}
                    size="md"
                  />

                  <TextInput
                    label="Field of Study"
                    description="Area of specialization"
                    required
                    value={formData.fieldOfStudy}
                    onChange={e => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                    placeholder="e.g. Computer Science"
                    leftSection={<IconBriefcase size={16} />}
                    size="md"
                  />

                  <DateInput
                    label="Graduation Date"
                    description="Date when degree was conferred"
                    required
                    value={formData.graduationDate}
                    onChange={date => setFormData({ ...formData, graduationDate: date })}
                    placeholder="Select graduation date"
                    leftSection={<IconCalendarEvent size={16} />}
                    size="md"
                    clearable={false}
                  />

                  <TextInput
                    label="Student ID"
                    description="University-assigned student identifier"
                    required
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="Enter student ID number"
                    leftSection={<IconUser size={16} />}
                    size="md"
                  />

                  <TextInput
                    label="Honors"
                    description="Academic distinctions (if any)"
                    value={formData.honors}
                    onChange={e => setFormData({ ...formData, honors: e.target.value })}
                    placeholder="e.g. First Class Honors"
                    size="md"
                  />

                  <TextInput
                    label="Program Duration"
                    description="Length of academic program"
                    required
                    value={formData.programDuration}
                    onChange={e => setFormData({ ...formData, programDuration: e.target.value })}
                    placeholder="e.g. 4 years"
                    size="md"
                  />

                  <NumberInput
                    label="GPA"
                    description="Grade Point Average (0.00 - 4.00)"
                    required
                    value={formData.gpa}
                    onChange={val =>
                      setFormData({ ...formData, gpa: typeof val === 'string' ? '' : val })
                    }
                    placeholder="Enter GPA"
                    min={0}
                    max={4}
                    step={0.01}
                    decimalScale={2}
                    fixedDecimalScale
                    clampBehavior="strict"
                    hideControls
                    error={
                      typeof formData.gpa === 'number' && (formData.gpa > 4 || formData.gpa < 0)
                        ? 'GPA must be between 0.00 and 4.00'
                        : null
                    }
                    size="md"
                  />

                  <Textarea
                    label="Additional Notes"
                    description="Other relevant information"
                    value={formData.additionalNotes}
                    onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                    placeholder="Any additional information about the degree"
                    minRows={3}
                    size="md"
                    style={{ gridColumn: '1 / -1' }}
                  />
                </SimpleGrid>

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
              description="Upload degree PDF"
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
                          Upload Degree Document
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
                  disabled={issueMutation.isPending || isUploading || !formData.file}
                  color="green"
                  leftSection={<IconBookUpload size={16} />}
                >
                  Issue Degree
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
                      Degree has been issued successfully
                    </Text>
                    <Text size="md" c="dimmed">
                      The degree certificate has been securely stored on the blockchain
                    </Text>

                    {issuedDegreeId && (
                      <Alert color="blue" variant="light" mt="md" mb="xl" radius="md">
                        <Text fw={500} mb={5}>
                          Document ID
                        </Text>
                        <Text size="sm" fw={700}>
                          {issuedDegreeId}
                        </Text>
                        <Text size="xs" c="dimmed" mt={8}>
                          This ID can be used to verify and access the degree certificate
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
                        setIssuedDegreeId(null);
                        setSuccess('');
                      }}
                    >
                      Issue Another Degree
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
