-- Migrate existing status values to loan/paid based on advances
-- paid: only when ALL advances for the request have status 'paid'
-- loan: otherwise (no advances, or any advance has status 'loan')
UPDATE "advance_request" ar
SET "status" = CASE
	WHEN NOT EXISTS (SELECT 1 FROM "advance" a WHERE a."advance_request_id" = ar."id") THEN 'loan'
	WHEN EXISTS (SELECT 1 FROM "advance" a WHERE a."advance_request_id" = ar."id" AND a."status" = 'loan') THEN 'loan'
	ELSE 'paid'
END
WHERE ar."status" IN ('pending', 'approved');--> statement-breakpoint
ALTER TABLE "advance_request" ADD CONSTRAINT "advance_request_status_check" CHECK ("status" IN ('loan', 'paid'));--> statement-breakpoint
ALTER TABLE "advance_request" ALTER COLUMN "status" SET DEFAULT 'loan';
