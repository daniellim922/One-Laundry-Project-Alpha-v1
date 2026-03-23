ALTER TABLE "payroll_voucher" ADD COLUMN "rest_days" real;--> statement-breakpoint
UPDATE "payroll_voucher" SET "rest_days" = p."rest_days" FROM "payroll" p WHERE p."payroll_voucher_id" = "payroll_voucher"."id";--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "rest_days";
