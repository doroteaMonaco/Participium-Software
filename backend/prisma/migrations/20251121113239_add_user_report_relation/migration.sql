/*
  Warnings:

  - Added the required column `userId` to the `report` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'SUSPENDED', 'REJECTED', 'RESOLVED');

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "userId" INTEGER NOT NULL;

-- Add constraint: rejectionReason must be NOT NULL only when status is REJECTED
ALTER TABLE "report" ADD CONSTRAINT report_rejection_reason_check
CHECK (
  (status = 'REJECTED' AND "rejectionReason" IS NOT NULL)
  OR
  (status != 'REJECTED' AND "rejectionReason" IS NULL)
);

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
