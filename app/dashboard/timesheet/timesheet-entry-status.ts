import type { TimesheetPaymentStatus } from "@/types/status";
import { timesheetPaymentStatusBadgeTone } from "@/types/badge-tones";

export type { TimesheetPaymentStatus };

export function formatTimesheetEntryStatus(status: TimesheetPaymentStatus): string {
    return status === "paid" ? "Paid" : "Unpaid";
}

export function timesheetEntryStatusPillClass(status: TimesheetPaymentStatus): string {
    return timesheetPaymentStatusBadgeTone[status];
}
