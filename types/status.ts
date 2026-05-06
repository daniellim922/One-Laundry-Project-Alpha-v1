export type AdvanceLoanStatus = "Advance Loan" | "Advance Paid";

export type InstallmentStatus = "Installment Loan" | "Installment Paid";

export type TimesheetPaymentStatus = "Timesheet Unpaid" | "Timesheet Paid";

export type PayrollStatus = "Draft" | "Settled";

export type ExpenseStatus = "Expense Submitted" | "Expense Paid";

export const WORKER_STATUSES = ["Active", "Inactive"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

/** Single source of truth for Drizzle columns, Zod, and UI labels */
export const WORKER_EMPLOYMENT_TYPES = ["Full Time", "Part Time"] as const;
export type WorkerEmploymentType = (typeof WORKER_EMPLOYMENT_TYPES)[number];

export const WORKER_EMPLOYMENT_ARRANGEMENTS = [
    "Foreign Worker",
    "Local Worker",
] as const;
export type WorkerEmploymentArrangement =
    (typeof WORKER_EMPLOYMENT_ARRANGEMENTS)[number];

export const WORKER_SHIFT_PATTERNS = ["Day Shift", "Night Shift"] as const;
export type WorkerShiftPattern = (typeof WORKER_SHIFT_PATTERNS)[number];

export const WORKER_PAYMENT_METHODS = [
    "PayNow",
    "Bank Transfer",
    "Cash",
] as const;
export type WorkerPaymentMethod = (typeof WORKER_PAYMENT_METHODS)[number];
