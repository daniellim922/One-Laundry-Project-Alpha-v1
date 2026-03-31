import type { LoanPaidStatus } from "@/types/status";

export const loanPaidToneClassName: Record<LoanPaidStatus, string> = {
    loan: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

