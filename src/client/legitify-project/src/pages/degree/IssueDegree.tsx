import {
  Alert,
  Button,
  Container,
  FileInput,
  Grid,
  NumberInput,
  Progress,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useState } from 'react';
import { useIssueDegree } from '../../api/degrees/degree.queries';
import { useAuth } from '../../contexts/AuthContext';
import { fileToBase64 } from '../../utils/fileUtils';

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
  });
  const [success, setSuccess] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { refreshSession } = useAuth();
  const issueMutation = useIssueDegree();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess('');
    setIsUploading(true);
    setUploadProgress(0);

    if (!formData.file || !formData.email || !formData.degreeTitle || !formData.fieldOfStudy) {
      setLocalError('Please fill in all required fields');
      setIsUploading(false);
      return;
    }

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

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
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(`Degree issued successfully! Document ID: ${result.docId}`);

      // Reset form
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
      });
    } catch (error: any) {
      console.error('Degree issuance failed:', error);
      setLocalError(error.message || 'Failed to issue degree');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Issue New Degree
      </Title>
      <form onSubmit={handleSubmit}>
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Student Email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter student's email address"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Degree Title"
              required
              value={formData.degreeTitle}
              onChange={e => setFormData({ ...formData, degreeTitle: e.target.value })}
              placeholder="e.g. Bachelor of Computer Science"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Field of Study"
              required
              value={formData.fieldOfStudy}
              onChange={e => setFormData({ ...formData, fieldOfStudy: e.target.value })}
              placeholder="e.g. Computer Science"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <DateInput
              label="Graduation Date"
              required
              value={formData.graduationDate}
              onChange={date => setFormData({ ...formData, graduationDate: date })}
              placeholder="Select graduation date"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Student ID"
              required
              value={formData.studentId}
              onChange={e => setFormData({ ...formData, studentId: e.target.value })}
              placeholder="Enter student ID number"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Honors"
              value={formData.honors}
              onChange={e => setFormData({ ...formData, honors: e.target.value })}
              placeholder="e.g. First Class Honors"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <TextInput
              label="Program Duration"
              required
              value={formData.programDuration}
              onChange={e => setFormData({ ...formData, programDuration: e.target.value })}
              placeholder="e.g. 4 years"
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <NumberInput
              label="GPA"
              required
              value={formData.gpa}
              onChange={val =>
                setFormData({ ...formData, gpa: typeof val === 'string' ? '' : val })
              }
              placeholder="Enter GPA"
              min={0}
              max={4}
              decimalScale={2}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <FileInput
              label="Degree Document (PDF)"
              required
              accept="application/pdf"
              value={formData.file}
              onChange={file => setFormData({ ...formData, file })}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Textarea
              label="Additional Notes"
              value={formData.additionalNotes}
              onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
              placeholder="Any additional information about the degree"
              minRows={3}
            />
          </Grid.Col>
        </Grid>

        {isUploading && (
          <>
            <Text size="sm" mb="xs">
              Uploading document...
            </Text>
            <Progress
              value={uploadProgress}
              mb="md"
              color={uploadProgress === 100 ? 'green' : 'blue'}
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
          mt="xl"
        >
          Issue Degree
        </Button>
      </form>
    </Container>
  );
}
