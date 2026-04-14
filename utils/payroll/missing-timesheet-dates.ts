/**
 * Calendar days in [periodStart, periodEnd] with no timesheet row whose dateIn equals that day.
 * Aligns with payroll breakdown "Missing dates".
 */

import {
    dateFromIsoLocalMidnight,
    timesheetDateInKey,
} from "@/utils/time/iso-local-midnight";

export const REST_DAY_DEFAULT_BUDGET = 4;

export { timesheetDateInKey };

/**
 * ISO date keys in [periodStart, periodEnd] with no clock-in on that day, in chronological order.
 */
export function listMissingTimesheetDateIns(args: {
    periodStart: string;
    periodEnd: string;
    presentDateInKeys: Iterable<string>;
}): string[] {
    const present = new Set(
        [...args.presentDateInKeys].map((k) => timesheetDateInKey(k)),
    );
    const missing: string[] = [];
    const start = dateFromIsoLocalMidnight(timesheetDateInKey(args.periodStart));
    const end = dateFromIsoLocalMidnight(timesheetDateInKey(args.periodEnd));
    const cursor = new Date(start);
    while (cursor <= end) {
        const key = timesheetDateInKey(cursor);
        if (!present.has(key)) missing.push(key);
        cursor.setDate(cursor.getDate() + 1);
    }
    return missing;
}

export function countMissingTimesheetDateIns(args: {
    periodStart: string;
    periodEnd: string;
    presentDateInKeys: Iterable<string>;
}): number {
    return listMissingTimesheetDateIns(args).length;
}

export function restDaysFromMissingDateCount(missingCount: number): number {
    return Math.max(0, REST_DAY_DEFAULT_BUDGET - missingCount);
}
