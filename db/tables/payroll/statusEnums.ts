import { pgEnum } from "drizzle-orm/pg-core";

export const workerStatusEnum = pgEnum("worker_status", [
    "Active",
    "Inactive",
]);

export const loanPaidStatusEnum = pgEnum("loan_paid_status", [
    "Loan",
    "Paid",
]);

export const timesheetPaymentStatusEnum = pgEnum("timesheet_payment_status", [
    "Unpaid",
    "Paid",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
    "Draft",
    "Settled",
]);
