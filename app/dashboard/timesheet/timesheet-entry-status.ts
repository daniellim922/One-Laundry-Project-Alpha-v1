export type TimesheetPaymentStatus = "unpaid" | "paid";

export function formatTimesheetEntryStatus(status: TimesheetPaymentStatus): string {
    return status === "paid" ? "Paid" : "Unpaid";
}

export function timesheetEntryStatusPillClass(status: TimesheetPaymentStatus): string {
    return status === "paid"
        ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";
}
