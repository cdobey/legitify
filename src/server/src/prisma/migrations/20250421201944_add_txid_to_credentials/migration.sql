/*
  Warnings:

  - You are about to drop the column `issuanceDate` on the `Credential` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "issuanceDate",
ADD COLUMN     "txId" TEXT;
