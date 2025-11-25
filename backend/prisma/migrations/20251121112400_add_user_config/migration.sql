-- AlterTable
ALTER TABLE "user" ADD COLUMN     "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profilePhoto" TEXT,
ADD COLUMN     "telegramUsername" TEXT;

-- Add constraint: profilePhoto, telegramUsername, and notifications must be NULL if role is MUNICIPALITY
ALTER TABLE "user" ADD CONSTRAINT user_municipality_config_check 
CHECK (
  (role = 'MUNICIPALITY' AND "profilePhoto" IS NULL AND "telegramUsername" IS NULL) 
  OR 
  role != 'MUNICIPALITY'
);
