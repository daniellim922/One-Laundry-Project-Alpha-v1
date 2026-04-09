import type {
    AdvanceLoanStatus,
    InstallmentStatus,
    PayrollStatus,
    TimesheetPaymentStatus,
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerPaymentMethod,
    WorkerStatus,
} from "@/types/status";

export const advanceLoanToneClassName: Record<AdvanceLoanStatus, string> = {
    "Advance Loan":
        "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    "Advance Paid":
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const installmentToneClassName: Record<InstallmentStatus, string> = {
    "Installment Loan":
        "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    "Installment Paid":
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export const timesheetPaymentStatusBadgeTone: Record<
    TimesheetPaymentStatus,
    string
> = {
    "Timesheet Unpaid": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
    "Timesheet Paid": "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
};

export const payrollStatusBadgeTone: Record<PayrollStatus, string> = {
    Draft: "bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
    Settled:
        "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
};

export const employmentTypeBadgeTone: Record<WorkerEmploymentType, string> = {
    "Full Time":
        "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300",
    "Part Time":
        "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
};

export const employmentArrangementBadgeTone: Record<
    WorkerEmploymentArrangement,
    string
> = {
    "Foreign Worker":
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    "Local Worker":
        "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
};

export const workerStatusBadgeTone: Record<WorkerStatus, string> = {
    Active: "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-300",
    Inactive: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

export const workerPaymentMethodBadgeTone: Record<WorkerPaymentMethod, string> =
    {
        PayNow: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
        "Bank Transfer":
            "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
        Cash: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
    };
