-- Rename timesheet payment status values: Unpaid -> Timesheet Unpaid, Paid -> Timesheet Paid
-- Dev-only migration: assumes database will be re-seeded after running.

ALTER TABLE "timesheet" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint

ALTER TABLE "timesheet" DROP CONSTRAINT IF EXISTS "timesheet_status_check";--> statement-breakpoint

UPDATE "timesheet" SET "status" = 'Timesheet Unpaid' WHERE "status" = 'Unpaid';--> statement-breakpoint
UPDATE "timesheet" SET "status" = 'Timesheet Paid' WHERE "status" = 'Paid';--> statement-breakpoint

DROP TYPE IF EXISTS "public"."timesheet_payment_status";--> statement-breakpoint
CREATE TYPE "public"."timesheet_payment_status" AS ENUM('Timesheet Unpaid', 'Timesheet Paid');--> statement-breakpoint

ALTER TABLE "timesheet" ALTER COLUMN "status"
  SET DATA TYPE "public"."timesheet_payment_status"
  USING "status"::"public"."timesheet_payment_status";--> statement-breakpoint

ALTER TABLE "timesheet" ALTER COLUMN "status" SET DEFAULT 'Timesheet Unpaid';
