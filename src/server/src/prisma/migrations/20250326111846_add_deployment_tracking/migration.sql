-- CreateTable
CREATE TABLE "DeploymentInfo" (
    "id" TEXT NOT NULL,
    "commit_hash" TEXT NOT NULL,
    "deployed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentInfo_pkey" PRIMARY KEY ("id")
);
