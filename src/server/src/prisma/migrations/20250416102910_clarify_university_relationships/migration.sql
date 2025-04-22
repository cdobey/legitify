/*
  Warnings:

  - You are about to drop the `Affiliation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_IssuerMembers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('pending', 'active', 'rejected');

-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_userId_fkey";

-- DropForeignKey
ALTER TABLE "_IssuerMembers" DROP CONSTRAINT "_IssuerMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_IssuerMembers" DROP CONSTRAINT "_IssuerMembers_B_fkey";

-- DropTable
DROP TABLE "Affiliation";

-- DropTable
DROP TABLE "_IssuerMembers";

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
CREATE TABLE "HolderAffiliation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'pending',
    "initiatedBy" TEXT DEFAULT 'holder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolderAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuerMember_userId_issuerId_key" ON "IssuerMember"("userId", "issuerId");

-- CreateIndex
CREATE UNIQUE INDEX "HolderAffiliation_userId_issuerId_key" ON "HolderAffiliation"("userId", "issuerId");

-- AddForeignKey
ALTER TABLE "IssuerMember" ADD CONSTRAINT "IssuerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerMember" ADD CONSTRAINT "IssuerMember_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolderAffiliation" ADD CONSTRAINT "HolderAffiliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolderAffiliation" ADD CONSTRAINT "HolderAffiliation_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
