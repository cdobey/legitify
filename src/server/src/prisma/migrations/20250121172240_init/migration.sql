/*
  Warnings:

  - The `status` column on the `Document` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Request` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `orgName` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('university', 'individual', 'employer');

-- CreateEnum
CREATE TYPE "OrgName" AS ENUM ('orguniversity', 'orgindividual', 'orgemployer');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('issued', 'accepted', 'denied');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'granted', 'denied');

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "status",
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'issued';

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "status",
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL,
DROP COLUMN "orgName",
ADD COLUMN     "orgName" "OrgName" NOT NULL;
