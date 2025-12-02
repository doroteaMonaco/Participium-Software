/*
  Warnings:

  - You are about to drop the column `recipient_id` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `sender_id` on the `message` table. All the data in the column will be lost.
  - You are about to drop the column `municipality_role_id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - Added the required column `municipality_user_id` to the `message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_recipient_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "report" DROP CONSTRAINT "report_assignedOfficerId_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_municipality_role_id_fkey";

-- AlterTable
ALTER TABLE "message" DROP COLUMN "recipient_id",
DROP COLUMN "sender_id",
ADD COLUMN     "municipality_user_id" INTEGER NOT NULL,
ADD COLUMN     "sent_by_municipality" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "municipality_role_id",
DROP COLUMN "role";

-- DropEnum
DROP TYPE "roleType";

-- CreateTable
CREATE TABLE "municipality_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "municipality_role_id" INTEGER,

    CONSTRAINT "municipality_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipality_user_username_key" ON "municipality_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "municipality_user_email_key" ON "municipality_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_username_key" ON "admin_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- AddForeignKey
ALTER TABLE "municipality_user" ADD CONSTRAINT "municipality_user_municipality_role_id_fkey" FOREIGN KEY ("municipality_role_id") REFERENCES "municipality_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "municipality_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_municipality_user_id_fkey" FOREIGN KEY ("municipality_user_id") REFERENCES "municipality_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
