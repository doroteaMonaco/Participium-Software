-- AlterTable
ALTER TABLE "report" ADD COLUMN     "assignedOfficerId" INTEGER;

-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "sender_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_assignedOfficerId_idx" ON "report"("assignedOfficerId");

-- RenameForeignKey
ALTER TABLE "report" RENAME CONSTRAINT "report_userId_fkey" TO "report_user_id_fkey";

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
