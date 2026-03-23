ALTER TABLE "employment" RENAME COLUMN "hourly_pay" TO "hourly_rate";
ALTER TABLE "employment" RENAME COLUMN "rest_day_pay" TO "rest_day_rate";

ALTER TABLE "payroll_voucher" RENAME COLUMN "hourly_pay" TO "hourly_rate";
ALTER TABLE "payroll_voucher" RENAME COLUMN "rest_day_pay" TO "rest_day_rate";
ALTER TABLE "payroll_voucher" ADD COLUMN "overtime_pay" real;
ALTER TABLE "payroll_voucher" ADD COLUMN "rest_day_pay" real;
