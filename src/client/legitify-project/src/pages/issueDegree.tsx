"use client";
import { useState } from "react";
import {
  Button,
  TextInput,
  FileInput,
  Container,
  Title,
  Alert,
  Space,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export default function IssueDegree() {
  const [formData, setFormData] = useState({
    studentName: "",
    degreeType: "",
    graduationDate: "",
    universityName: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "document") {
      setFile(e.target.files?.[0] || null);
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a document");
      return;
    }
    // Here you would integrate with your Hyperledger Fabric network
    // For now, we'll just simulate hashing the file
    const simulatedHash = await simulateFileHash(file);
    setHash(simulatedHash);
    console.log("Issuing degree:", { ...formData, hash: simulatedHash });
    // Reset form after submission
    setFormData({
      studentName: "",
      degreeType: "",
      graduationDate: "",
      universityName: "",
    });
    setFile(null);
  };

  // This function simulates hashing a file
  // In a real application, you'd use a proper hashing function
  const simulateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = Math.random().toString(36).substring(2, 15);
        resolve(hash);
      }, 1000);
    });
  };

  return (
    <Container>
      <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
        Issue a Degree
      </Title>
      <form onSubmit={handleSubmit} style={{ maxWidth: "500px", margin: "0 auto" }}>
        <TextInput
          label="Student Name"
          name="studentName"
          value={formData.studentName}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Degree Type"
          name="degreeType"
          value={formData.degreeType}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Graduation Date"
          name="graduationDate"
          type="date"
          value={formData.graduationDate}
          onChange={handleChange}
          required
        />
        <TextInput
          label="University Name"
          name="universityName"
          value={formData.universityName}
          onChange={handleChange}
          required
        />
        <FileInput
          label="Upload Degree Document (PDF)"
          placeholder="Choose file"
          onChange={setFile}
          accept=".pdf"
          required
        />
        <Space h="md" />
        <Button type="submit" fullWidth>
          Issue Degree
        </Button>
      </form>
      {hash && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Degree Issued Successfully"
          color="green"
          withCloseButton
          closeButtonLabel="Close alert"
          variant="filled"
          style={{ marginTop: "1rem" }}
        >
          The degree has been issued and added to the blockchain. The hash of the document is: {hash}
        </Alert>
      )}
    </Container>
  );
}
