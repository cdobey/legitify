-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "achievementDate" TIMESTAMP(3),
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "ledgerTimestamp" TEXT,
ADD COLUMN     "programLength" TEXT;
