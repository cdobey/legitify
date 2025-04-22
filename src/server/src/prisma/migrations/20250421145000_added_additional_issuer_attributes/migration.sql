/*
  Warnings:

  - You are about to drop the column `displayName` on the `Issuer` table. All the data in the column will be lost.
  - Added the required column `shorthand` to the `Issuer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Issuer" DROP COLUMN "displayName",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "shorthand" TEXT NOT NULL,
ADD COLUMN     "website" TEXT;
