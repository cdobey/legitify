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

export default function VerifyDegree() {
  const [formData, setFormData] = useState({
    degreeHash: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "document") {
      setFile(e.target.files?.[0] || null);
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a document");
      return;
    }

    // Here you would integrate with your Hyperledger Fabric network
    // For now, we'll just simulate hashing the file and comparing it
    const simulatedHash = await simulateFileHash(file);
    const isVerified = simulatedHash === formData.degreeHash;

    setVerificationResult(
      isVerified
        ? "Degree verified successfully!"
        : "Verification failed. The document does not match the recorded hash."
    );
  };

  // This function simulates hashing a file
  // In a real application, you'd use the same hashing function as in the issue page
  const simulateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = Math.random().toString(36).substring(2, 15);
        resolve(hash);
      }, 1000);
    });
  };

  return (
    <Container size="xs">
      <Title order={2}  style={{ marginBottom: "1rem", textAlign: "center" }}>
        Verify a Degree
      </Title>
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Degree Hash"
          name="degreeHash"
          value={formData.degreeHash}
          onChange={handleChange}
          required
          style={{ marginBottom: "1rem" }}
        />
        <FileInput
          label="Upload Degree Document (PDF)"
          placeholder="Choose file"
          onChange={setFile}
          accept=".pdf"
          required
          style={{ marginBottom: "1rem" }}
        />
        <Space h="md" />
        <Button type="submit" fullWidth>
          Verify Degree
        </Button>
      </form>
      {verificationResult && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={verificationResult.includes("successfully") ? "Verification Successful" : "Verification Failed"}
          color={verificationResult.includes("successfully") ? "green" : "red"}
          radius="md"
          style={{ marginTop: "1rem" }}
        >
          {verificationResult}
        </Alert>
      )}
    </Container>
  );
}
