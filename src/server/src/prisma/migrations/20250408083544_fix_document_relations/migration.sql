-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
