export type TimesheetPaymentStatus = "unpaid" | "paid";

export function formatTimesheetEntryStatus(status: TimesheetPaymentStatus): string {
    return status === "paid" ? "Paid" : "Unpaid";
}

export function timesheetEntryStatusPillClass(status: TimesheetPaymentStatus): string {
    return status === "paid"
        ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800"
        : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800";
}
