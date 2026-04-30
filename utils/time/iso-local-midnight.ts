import { dateToLocalIsoYmd, parseIsoToDateStrict } from "./calendar-date";

/** Strict ISO YYYY-MM-DD to local calendar midnight. */

/**
 * Best-effort parse for display/filter: YYYY-MM-DD prefix uses strict calendar
 * rules; otherwise local midnight from plain date strings.
 */

/**
 * Normalize timesheet `dateIn` (or any calendar-ish value) to YYYY-MM-DD for
 * set membership and sorting.
 */
export function timesheetDateInKey(d: string | Date): string {
    if (d instanceof Date) {
        return dateToLocalIsoYmd(d);
    }
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        return dateToLocalIsoYmd(parsed);
    }
    return s;
}

export function dateFromIsoLocalMidnight(key: string): Date {
    return new Date(`${key}T00:00:00`);
}
