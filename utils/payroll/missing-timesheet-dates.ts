/**
 * Calendar days in [periodStart, periodEnd] with no timesheet row whose dateIn equals that day.
 * Aligns with payroll breakdown "Missing dates".
 */

export const REST_DAY_DEFAULT_BUDGET = 4;

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

/** Normalize a timesheet dateIn (or Date) to YYYY-MM-DD for set membership. */
export function timesheetDateInKey(d: string | Date): string {
    if (d instanceof Date) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    }
    return s;
}

function dateFromKey(key: string): Date {
    return new Date(`${key}T00:00:00`);
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
    const start = dateFromKey(timesheetDateInKey(args.periodStart));
    const end = dateFromKey(timesheetDateInKey(args.periodEnd));
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
