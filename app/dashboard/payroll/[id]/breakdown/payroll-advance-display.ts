export { loanPaidToneClassName as payrollAdvanceStatusBadgeClass } from "@/types/badge-tones";
export type { LoanPaidStatus as PayrollAdvanceStatus } from "@/types/status";

export function formatPayrollAdvanceDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
