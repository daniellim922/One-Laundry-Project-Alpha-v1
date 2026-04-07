DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status') THEN
        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'payroll_status' AND e.enumlabel = 'draft'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'payroll_status' AND e.enumlabel = 'Draft'
        ) THEN
            ALTER TYPE payroll_status RENAME VALUE 'draft' TO 'Draft';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'payroll_status' AND e.enumlabel = 'settled'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'payroll_status' AND e.enumlabel = 'Settled'
        ) THEN
            ALTER TYPE payroll_status RENAME VALUE 'settled' TO 'Settled';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timesheet_status') THEN
        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'timesheet_status' AND e.enumlabel = 'unpaid'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'timesheet_status' AND e.enumlabel = 'Unpaid'
        ) THEN
            ALTER TYPE timesheet_status RENAME VALUE 'unpaid' TO 'Unpaid';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'timesheet_status' AND e.enumlabel = 'paid'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'timesheet_status' AND e.enumlabel = 'Paid'
        ) THEN
            ALTER TYPE timesheet_status RENAME VALUE 'paid' TO 'Paid';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'advance_status') THEN
        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_status' AND e.enumlabel = 'loan'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_status' AND e.enumlabel = 'Loan'
        ) THEN
            ALTER TYPE advance_status RENAME VALUE 'loan' TO 'Loan';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_status' AND e.enumlabel = 'paid'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_status' AND e.enumlabel = 'Paid'
        ) THEN
            ALTER TYPE advance_status RENAME VALUE 'paid' TO 'Paid';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'advance_request_status') THEN
        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_request_status' AND e.enumlabel = 'loan'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_request_status' AND e.enumlabel = 'Loan'
        ) THEN
            ALTER TYPE advance_request_status RENAME VALUE 'loan' TO 'Loan';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_request_status' AND e.enumlabel = 'paid'
        ) AND NOT EXISTS (
            SELECT 1
            FROM pg_type t
            INNER JOIN pg_enum e ON e.enumtypid = t.oid
            WHERE t.typname = 'advance_request_status' AND e.enumlabel = 'Paid'
        ) THEN
            ALTER TYPE advance_request_status RENAME VALUE 'paid' TO 'Paid';
        END IF;
    END IF;
END $$;--> statement-breakpoint

UPDATE "payroll"
SET "status" = 'Draft'
WHERE lower("status"::text) = 'draft';--> statement-breakpoint

UPDATE "payroll"
SET "status" = 'Settled'
WHERE lower("status"::text) IN ('settled', 'settle', 'paid');--> statement-breakpoint

UPDATE "timesheet"
SET "status" = 'Unpaid'
WHERE lower("status"::text) = 'unpaid';--> statement-breakpoint

UPDATE "timesheet"
SET "status" = 'Paid'
WHERE lower("status"::text) = 'paid';--> statement-breakpoint

UPDATE "advance"
SET "status" = 'Loan'
WHERE lower("status"::text) IN ('loan', 'pending', 'approved');--> statement-breakpoint

UPDATE "advance"
SET "status" = 'Paid'
WHERE lower("status"::text) = 'paid';--> statement-breakpoint

UPDATE "advance_request"
SET "status" = 'Loan'
WHERE lower("status"::text) IN ('loan', 'pending', 'approved');--> statement-breakpoint

UPDATE "advance_request"
SET "status" = 'Paid'
WHERE lower("status"::text) = 'paid';--> statement-breakpoint

ALTER TABLE "payroll" ALTER COLUMN "status" SET DEFAULT 'Draft';--> statement-breakpoint
ALTER TABLE "timesheet" ALTER COLUMN "status" SET DEFAULT 'Unpaid';--> statement-breakpoint
ALTER TABLE "advance" ALTER COLUMN "status" SET DEFAULT 'Loan';--> statement-breakpoint
ALTER TABLE "advance_request" ALTER COLUMN "status" SET DEFAULT 'Loan';--> statement-breakpoint

ALTER TABLE "payroll" DROP CONSTRAINT IF EXISTS "payroll_status_check";--> statement-breakpoint
ALTER TABLE "timesheet" DROP CONSTRAINT IF EXISTS "timesheet_status_check";--> statement-breakpoint
ALTER TABLE "advance" DROP CONSTRAINT IF EXISTS "advance_status_check";--> statement-breakpoint
ALTER TABLE "advance_request" DROP CONSTRAINT IF EXISTS "advance_request_status_check";--> statement-breakpoint

ALTER TABLE "payroll" ADD CONSTRAINT "payroll_status_check" CHECK ("status" IN ('Draft', 'Settled'));--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_status_check" CHECK ("status" IN ('Unpaid', 'Paid'));--> statement-breakpoint
ALTER TABLE "advance" ADD CONSTRAINT "advance_status_check" CHECK ("status" IN ('Loan', 'Paid'));--> statement-breakpoint
ALTER TABLE "advance_request" ADD CONSTRAINT "advance_request_status_check" CHECK ("status" IN ('Loan', 'Paid'));--> statement-breakpoint
