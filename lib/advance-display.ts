import type { SelectAdvance } from "@/db/tables/payroll/advanceTable";

export const advanceStatusBadgeClass: Record<SelectAdvance["status"], string> = {
    loan: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export function formatAdvanceDate(d: string | Date): string {
    const date = d instanceof Date ? d : new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatAdvanceAmount(amount: number): string {
    return `$${amount}`;
}

export function advanceDetailPath(id: string): string {
    return `/dashboard/advance/${id}`;
}
