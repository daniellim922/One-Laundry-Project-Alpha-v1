export type TimesheetPaymentStatus = "unpaid" | "paid";

export function formatTimesheetEntryStatus(status: TimesheetPaymentStatus): string {
    return status === "paid" ? "Paid" : "Unpaid";
}

export function timesheetEntryStatusPillClass(status: TimesheetPaymentStatus): string {
    return status === "paid"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";
}
