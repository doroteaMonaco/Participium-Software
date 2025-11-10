-- Migration: add latitude and longitude to report table
-- Timestamp: 2025-11-08 12:00:00

ALTER TABLE public.report
ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE public.report
ADD COLUMN IF NOT EXISTS longitude double precision;
