-- Split shared loan_paid_status enum into separate advance_loan_status and installment_status enums.
-- Dev-only migration: assumes database will be re-seeded after running.

CREATE TYPE "public"."advance_loan_status" AS ENUM('Advance Loan', 'Advance Paid');--> statement-breakpoint
CREATE TYPE "public"."installment_status" AS ENUM('Installment Loan', 'Installment Paid');--> statement-breakpoint

ALTER TABLE "advance_request" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "advance" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "advance_request" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "advance" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "advance_request" DROP CONSTRAINT IF EXISTS "advance_request_status_check";--> statement-breakpoint
ALTER TABLE "advance" DROP CONSTRAINT IF EXISTS "advance_status_check";--> statement-breakpoint

UPDATE "advance_request" SET "status" = 'Advance Loan' WHERE "status" = 'Loan';--> statement-breakpoint
UPDATE "advance_request" SET "status" = 'Advance Paid' WHERE "status" = 'Paid';--> statement-breakpoint
UPDATE "advance" SET "status" = 'Installment Loan' WHERE "status" = 'Loan';--> statement-breakpoint
UPDATE "advance" SET "status" = 'Installment Paid' WHERE "status" = 'Paid';--> statement-breakpoint

ALTER TABLE "advance_request" ALTER COLUMN "status" SET DATA TYPE "public"."advance_loan_status" USING "status"::"public"."advance_loan_status";--> statement-breakpoint
ALTER TABLE "advance_request" ALTER COLUMN "status" SET DEFAULT 'Advance Loan';--> statement-breakpoint

ALTER TABLE "advance" ALTER COLUMN "status" SET DATA TYPE "public"."installment_status" USING "status"::"public"."installment_status";--> statement-breakpoint
ALTER TABLE "advance" ALTER COLUMN "status" SET DEFAULT 'Installment Loan';--> statement-breakpoint

DROP TYPE IF EXISTS "public"."loan_paid_status";
