-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
