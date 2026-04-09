import { pgEnum } from "drizzle-orm/pg-core";

export const workerStatusEnum = pgEnum("worker_status", ["Active", "Inactive"]);

export const advanceLoanStatusEnum = pgEnum("advance_loan_status", [
    "Advance Loan",
    "Advance Paid",
]);

export const installmentStatusEnum = pgEnum("installment_status", [
    "Installment Loan",
    "Installment Paid",
]);

export const timesheetPaymentStatusEnum = pgEnum("timesheet_payment_status", [
    "Timesheet Unpaid",
    "Timesheet Paid",
]);

export const payrollStatusEnum = pgEnum("payroll_status", ["Draft", "Settled"]);
