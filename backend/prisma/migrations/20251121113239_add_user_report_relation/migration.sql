/*
  Safe/idempotent migration

  This migration uses conditional checks so it can be re-applied safely when
  the database already has some of the columns added (partial application).
  It also sets a default for `status` and updates existing NULLs before
  applying NOT NULL to avoid failures on non-empty tables.
*/

-- Create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reportstatus') THEN
    CREATE TYPE "reportStatus" AS ENUM ('PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'SUSPENDED', 'REJECTED', 'RESOLVED');
  END IF;
END$$;

-- Add columns if they don't exist (status added nullable first)
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "status" "reportStatus";
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "user_id" INTEGER;

-- For existing rows set a sane default where status is NULL
UPDATE "report" SET status = 'PENDING_APPROVAL' WHERE status IS NULL;

-- Set DEFAULT and enforce NOT NULL for status
ALTER TABLE "report" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
ALTER TABLE "report" ALTER COLUMN "status" SET NOT NULL;

-- Add constraint: rejectionReason must be NOT NULL only when status is REJECTED
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_rejection_reason_check'
  ) THEN
    ALTER TABLE "report" ADD CONSTRAINT report_rejection_reason_check
    CHECK (
      (status = 'REJECTED' AND "rejectionReason" IS NOT NULL)
      OR
      (status != 'REJECTED' AND "rejectionReason" IS NULL)
    );
  END IF;
END$$;

-- Add foreign key to user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_userId_fkey'
  ) THEN
    ALTER TABLE "report" ADD CONSTRAINT "report_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
