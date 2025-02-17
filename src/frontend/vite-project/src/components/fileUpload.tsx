//import type { ChangeEvent } from "react";
import type React from "react";
import { FileInput } from "@mantine/core";

interface FileUploadProps {
  onFileRead: (base64: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileRead }) => {
  const handleFileChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onFileRead(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <FileInput 
      label="Upload Degree Document (PDF)" 
      placeholder="Choose file" 
      onChange={handleFileChange} 
      accept=".pdf" 
    />
  );
};

export default FileUpload;
