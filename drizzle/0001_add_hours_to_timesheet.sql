-- Add hours column to timesheet
ALTER TABLE "timesheet" ADD COLUMN IF NOT EXISTS "hours" real DEFAULT 0 NOT NULL;

-- Backfill hours from date_in, time_in, date_out, time_out
UPDATE "timesheet"
SET "hours" = ROUND(
    (EXTRACT(EPOCH FROM ((date_out + time_out) - (date_in + time_in))) / 3600)::numeric,
    2
);