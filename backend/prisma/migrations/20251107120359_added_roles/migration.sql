-- CreateEnum
CREATE TYPE "roleType" AS ENUM ('CUSTOMER', 'ADMIN', 'MUNICIPALITY');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "municipality_role_id" INTEGER,
ADD COLUMN     "role" "roleType" NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE "municipality_role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "municipality_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipality_role_name_key" ON "municipality_role"("name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_municipality_role_id_fkey" FOREIGN KEY ("municipality_role_id") REFERENCES "municipality_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- check constraint to ensure municipality_role_id is set only when role is 'municipality'
ALTER TABLE "user" ADD CONSTRAINT "check_municipality_role" 
    CHECK (
        ("role" = 'MUNICIPALITY' AND "municipality_role_id" IS NOT NULL) OR
        ("role" != 'MUNICIPALITY' AND "municipality_role_id" IS NULL)
    );