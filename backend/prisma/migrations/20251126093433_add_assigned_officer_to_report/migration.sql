-- AlterTable
ALTER TABLE "report" ADD COLUMN     "assignedOfficerId" INTEGER;

-- CreateIndex
CREATE INDEX "report_assignedOfficerId_idx" ON "report"("assignedOfficerId");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
