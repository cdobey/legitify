/*
  Warnings:

  - You are about to drop the `Affiliation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UniversityMembers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('pending', 'active', 'rejected');

-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_universityId_fkey";

-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_userId_fkey";

-- DropForeignKey
ALTER TABLE "_UniversityMembers" DROP CONSTRAINT "_UniversityMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_UniversityMembers" DROP CONSTRAINT "_UniversityMembers_B_fkey";

-- DropTable
DROP TABLE "Affiliation";

-- DropTable
DROP TABLE "_UniversityMembers";

-- CreateTable
CREATE TABLE "UniversityMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" "MembershipStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversityMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAffiliation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'pending',
    "initiatedBy" TEXT DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UniversityMember_userId_universityId_key" ON "UniversityMember"("userId", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAffiliation_userId_universityId_key" ON "StudentAffiliation"("userId", "universityId");

-- AddForeignKey
ALTER TABLE "UniversityMember" ADD CONSTRAINT "UniversityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityMember" ADD CONSTRAINT "UniversityMember_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAffiliation" ADD CONSTRAINT "StudentAffiliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAffiliation" ADD CONSTRAINT "StudentAffiliation_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
