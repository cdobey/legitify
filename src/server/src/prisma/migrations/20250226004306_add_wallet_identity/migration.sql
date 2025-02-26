-- CreateTable
CREATE TABLE "WalletIdentity" (
    "label" TEXT NOT NULL,
    "orgName" "OrgName" NOT NULL,
    "type" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "mspId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletIdentity_pkey" PRIMARY KEY ("label")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletIdentity_label_orgName_key" ON "WalletIdentity"("label", "orgName");
