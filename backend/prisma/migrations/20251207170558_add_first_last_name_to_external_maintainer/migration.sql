/*
  Warnings:

  - Added the required column `firstName` to the `external_maintainer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `external_maintainer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "external_maintainer" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;
