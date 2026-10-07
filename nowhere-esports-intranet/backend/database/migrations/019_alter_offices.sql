-- =============================================================================
-- Migration 019: Alter offices table to support extended attributes
-- =============================================================================

ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS is_hq BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS working_hours TEXT NOT NULL DEFAULT '09:00 - 18:00';
