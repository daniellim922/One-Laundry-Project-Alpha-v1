import { parseIsoToDateStrict } from "./calendar-date";

const enGbDmyNumeric = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

const enGbDayMonthShort = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
});

const enGbDayMonthLongYear = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

/** en-GB numeric calendar date (DD/MM/YYYY) for UI and tables. */
export function formatEnGbDmyNumeric(date: Date): string {
    return enGbDmyNumeric.format(date);
}

/** ISO YYYY-MM-DD to en-GB numeric display; empty string if invalid. */
export function formatEnGbDmyNumericFromIso(iso: string): string {
    const d = parseIsoToDateStrict(iso);
    return d ? formatEnGbDmyNumeric(d) : "";
}

/**
 * Calendar YYYY-MM-DD string, ISO datetime string, or Date — en-GB numeric DMY.
 * Matches former `localDateDmy` behaviour for wire dates and Date instances.
 */
export function formatEnGbDmyNumericFromCalendar(value: string | Date): string {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : formatEnGbDmyNumeric(value);
    }
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = parseIsoToDateStrict(s);
        return d ? formatEnGbDmyNumeric(d) : "";
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? "" : formatEnGbDmyNumeric(d);
    }
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "" : formatEnGbDmyNumeric(d);
}

export function formatEnGbDayMonthShort(date: Date): string {
    return enGbDayMonthShort.format(date);
}

export function formatEnGbDayMonthLongYear(date: Date): string {
    return enGbDayMonthLongYear.format(date);
}
