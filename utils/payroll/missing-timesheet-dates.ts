/**
 * Calendar days in [periodStart, periodEnd] with no timesheet row whose dateIn equals that day.
 * Aligns with payroll breakdown "Missing dates".
 *
 * Paid rest days (automatic path): start from a budget of actual Sundays in the pay period.
 * Each missing day (no clock-in on that date) reduces the budget by one. The result is
 * floored at zero and capped at the dynamic Sunday budget.
 */

import {
    dateFromIsoLocalMidnight,
    timesheetDateInKey,
} from "@/utils/time/iso-local-midnight";

export { timesheetDateInKey };

/**
 * Count the number of Sundays (rest days) within [periodStart, periodEnd].
 */
export function countSundaysInPeriod(args: {
    periodStart: string;
    periodEnd: string;
}): number {
    const start = dateFromIsoLocalMidnight(timesheetDateInKey(args.periodStart));
    const end = dateFromIsoLocalMidnight(timesheetDateInKey(args.periodEnd));
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
        if (cursor.getDay() === 0) count++;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}

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

export function restDaysFromMissingDateCount(
    missingCount: number,
    budget: number,
): number {
    return Math.min(budget, Math.max(0, budget - missingCount));
}

/**
 * Rest days implied by timesheet coverage for the pay period (automatic payroll / seed path).
 * Budget is the number of Sundays in the period, computed dynamically from the calendar.
 */
export function computeRestDaysForPayrollPeriod(args: {
    periodStart: string;
    periodEnd: string;
    presentDateInKeys: Iterable<string>;
}): number {
    const budget = countSundaysInPeriod({
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
    });
    return restDaysFromMissingDateCount(countMissingTimesheetDateIns(args), budget);
}
