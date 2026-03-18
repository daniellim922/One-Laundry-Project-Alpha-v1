CREATE TABLE "payroll_voucher" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_number" real,
	"employment_type" text,
	"employment_arrangement" text,
	"monthly_pay" real,
	"minimum_working_hours" real,
	"total_hours_worked" real,
	"overtime_hours" real,
	"hourly_pay" real,
	"rest_day_pay" real,
	"cpf" real,
	"total_pay" real,
	"payment_method" text,
	"paynow_phone" text,
	"bank_account_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "payroll_voucher_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "total_hours";--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "overtime_hours";--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "cpf";--> statement-breakpoint
ALTER TABLE "payroll" DROP COLUMN "total_pay";--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "rest_days" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_payroll_voucher_id_payroll_voucher_id_fk" FOREIGN KEY ("payroll_voucher_id") REFERENCES "public"."payroll_voucher"("id") ON DELETE no action ON UPDATE no action;
