import "./globals.css";
import { Inter } from "next/font/google";
import { Sidebar } from "";
import { AuthProvider } from "@/contexts/*";
import type React from "react";
import { AppShell, Container } from "@mantine/core";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Degree Verification System",
  description: "Issue, request, and verify university degrees",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" style={{ backgroundColor: "#f8fafc" }}>
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <AppShell
            navbar={<Sidebar />}
            styles={{
              main: {
                backgroundColor: "#f1f5f9",
                padding: "2rem",
                height: "100%",
                overflowY: "auto",
              },
            }}
          >
            <Container>{children}</Container>
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
