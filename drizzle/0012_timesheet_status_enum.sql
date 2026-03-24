ALTER TABLE "timesheet" ADD COLUMN "status" text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_status_check" CHECK ("status" IN ('unpaid', 'paid'));
