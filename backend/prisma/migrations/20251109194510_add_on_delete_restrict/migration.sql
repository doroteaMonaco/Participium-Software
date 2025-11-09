-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_municipality_role_id_fkey";

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_municipality_role_id_fkey" FOREIGN KEY ("municipality_role_id") REFERENCES "municipality_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
