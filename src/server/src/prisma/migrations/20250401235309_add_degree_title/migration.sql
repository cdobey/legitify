-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "degreeTitle" TEXT,
ADD COLUMN     "fieldOfStudy" TEXT,
ADD COLUMN     "gpa" DOUBLE PRECISION,
ADD COLUMN     "graduationDate" TIMESTAMP(3),
ADD COLUMN     "honors" TEXT,
ADD COLUMN     "programDuration" TEXT,
ADD COLUMN     "studentId" TEXT;
