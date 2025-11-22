-- Migration: add_assigned_office
-- Adds an optional text column `assignedOffice` to the `report` table.

DO $$
BEGIN
  -- Add column if not exists to make the migration idempotent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='report' AND column_name='assignedOffice'
  ) THEN
    ALTER TABLE "report" ADD COLUMN "assignedOffice" TEXT;
  END IF;
END$$;
