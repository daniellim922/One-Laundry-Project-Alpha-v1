ALTER TABLE "employment" RENAME COLUMN "working_hours" TO "minimum_working_hours";--> statement-breakpoint
ALTER TABLE "employment" ALTER COLUMN "cpf" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "employment" ALTER COLUMN "monthly_pay" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "employment" ALTER COLUMN "minimum_working_hours" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "employment" ALTER COLUMN "hourly_pay" SET DATA TYPE real;
