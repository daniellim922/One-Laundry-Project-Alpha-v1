import { and, eq, gte, lte } from "drizzle-orm";

import {
    timesheetTable,
    type SelectTimesheet,
} from "@/db/tables/timesheetTable";

export type PayrollTimesheetWindow = {
    workerId: string;
    periodStart: string;
    periodEnd: string;
    status?: SelectTimesheet["status"];
};

/**
 * Payroll membership is keyed by clock-in date. Night-shift checkouts may fall
 * after the payroll period end, but they still belong to the clock-in period.
 */
export function timesheetInPayrollWindowWhere(window: PayrollTimesheetWindow) {
    return and(
        eq(timesheetTable.workerId, window.workerId),
        gte(timesheetTable.dateIn, window.periodStart),
        lte(timesheetTable.dateIn, window.periodEnd),
        window.status ? eq(timesheetTable.status, window.status) : undefined,
    );
}
