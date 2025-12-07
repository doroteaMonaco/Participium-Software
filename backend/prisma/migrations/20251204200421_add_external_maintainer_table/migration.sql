-- AlterTable
ALTER TABLE "report" ADD COLUMN     "externalMaintainerId" INTEGER;

-- CreateTable
CREATE TABLE "external_maintainer" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "Category" NOT NULL,

    CONSTRAINT "external_maintainer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_maintainer_username_key" ON "external_maintainer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "external_maintainer_email_key" ON "external_maintainer"("email");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_externalMaintainerId_fkey" FOREIGN KEY ("externalMaintainerId") REFERENCES "external_maintainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
