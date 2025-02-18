"use client";

import { useState } from "react";
import {
  Button,
  TextInput,
  Container,
  Title,
  Alert,
  Space,
} from "@mantine/core";

export default function RequestAccess() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    universityName: "",
    graduationYear: "",
  });

  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would integrate with your Hyperledger Fabric network
    console.log("Requesting access:", formData);
    // Reset form after submission
    setFormData({
      name: "",
      email: "",
      universityName: "",
      graduationYear: "",
    });
    setSuccess(true);
  };

  return (
    <Container size="xs">
      <Title order={2} style={{ marginBottom: "1rem", textAlign: "center" }}>
        Request Access to Your Degree
      </Title>
      <form onSubmit={handleSubmit}>
        <TextInput
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ marginBottom: "1rem" }}
        />
        <TextInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ marginBottom: "1rem" }}
        />
        <TextInput
          label="University Name"
          name="universityName"
          value={formData.universityName}
          onChange={handleChange}
          required
          style={{ marginBottom: "1rem" }}
        />
        <TextInput
          label="Graduation Year"
          name="graduationYear"
          type="number"
          value={formData.graduationYear}
          onChange={handleChange}
          required
          style={{ marginBottom: "1rem" }}
        />
        <Space h="md" />
        <Button type="submit" fullWidth>
          Request Access
        </Button>
        {success && (
          <Alert title="Success" color="green" radius="md" style={{ marginTop: "1rem" }}>
            Access request submitted successfully!
          </Alert>
        )}
      </form>
    </Container>
  );
}
