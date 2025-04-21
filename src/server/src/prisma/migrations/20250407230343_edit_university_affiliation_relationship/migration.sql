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

-- CreateTable
CREATE TABLE "_IssuerMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IssuerMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_IssuerMembers_B_index" ON "_IssuerMembers"("B");

-- AddForeignKey
ALTER TABLE "IssuerJoinRequest" ADD CONSTRAINT "IssuerJoinRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerJoinRequest" ADD CONSTRAINT "IssuerJoinRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssuerMembers" ADD CONSTRAINT "_IssuerMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Issuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssuerMembers" ADD CONSTRAINT "_IssuerMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
