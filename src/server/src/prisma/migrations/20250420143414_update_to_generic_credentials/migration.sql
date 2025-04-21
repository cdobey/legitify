/*
  Warnings:

  - The values [orgissuer,orgholder,orgverifier] on the enum `OrgName` will be removed. If these variants are still used in the database, this will fail.
  - The values [issuer,holder,verifier] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `documentId` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HolderAffiliation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Issuer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IssuerJoinRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IssuerMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `credentialId` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('issued', 'accepted', 'denied');

-- AlterEnum
BEGIN;
CREATE TYPE "OrgName_new" AS ENUM ('orgissuer', 'orgholder', 'orgverifier');
ALTER TABLE "User" ALTER COLUMN "orgName" TYPE "OrgName_new" USING ("orgName"::text::"OrgName_new");
ALTER TABLE "WalletIdentity" ALTER COLUMN "orgName" TYPE "OrgName_new" USING ("orgName"::text::"OrgName_new");
ALTER TYPE "OrgName" RENAME TO "OrgName_old";
ALTER TYPE "OrgName_new" RENAME TO "OrgName";
DROP TYPE "OrgName_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('issuer', 'holder', 'verifier');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_issuedTo_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_issuer_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_documentId_fkey";

-- DropForeignKey
ALTER TABLE "HolderAffiliation" DROP CONSTRAINT "HolderAffiliation_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "HolderAffiliation" DROP CONSTRAINT "HolderAffiliation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Issuer" DROP CONSTRAINT "Issuer_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "IssuerJoinRequest" DROP CONSTRAINT "IssuerJoinRequest_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "IssuerJoinRequest" DROP CONSTRAINT "IssuerJoinRequest_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "IssuerMember" DROP CONSTRAINT "IssuerMember_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "IssuerMember" DROP CONSTRAINT "IssuerMember_userId_fkey";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "documentId",
ADD COLUMN     "credentialId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "HolderAffiliation";

-- DropTable
DROP TABLE "Issuer";

-- DropTable
DROP TABLE "IssuerJoinRequest";

-- DropTable
DROP TABLE "IssuerMember";

-- DropEnum
DROP TYPE "DocumentStatus";

-- CreateTable
CREATE TABLE "Issuer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "issuerType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuerMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" "MembershipStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuerAffiliation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'pending',
    "initiatedBy" TEXT DEFAULT 'holder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuerAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerOrgId" TEXT NOT NULL,
    "fileData" BYTEA,
    "status" "CredentialStatus" NOT NULL DEFAULT 'issued',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuerJoinRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuerJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_name_ownerId_key" ON "Issuer"("name", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuerMember_userId_issuerId_key" ON "IssuerMember"("userId", "issuerId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuerAffiliation_userId_issuerId_key" ON "IssuerAffiliation"("userId", "issuerId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_docId_key" ON "Credential"("docId");

-- AddForeignKey
ALTER TABLE "Issuer" ADD CONSTRAINT "Issuer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerMember" ADD CONSTRAINT "IssuerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerMember" ADD CONSTRAINT "IssuerMember_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerAffiliation" ADD CONSTRAINT "IssuerAffiliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerAffiliation" ADD CONSTRAINT "IssuerAffiliation_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_issuerOrgId_fkey" FOREIGN KEY ("issuerOrgId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerJoinRequest" ADD CONSTRAINT "IssuerJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerJoinRequest" ADD CONSTRAINT "IssuerJoinRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
