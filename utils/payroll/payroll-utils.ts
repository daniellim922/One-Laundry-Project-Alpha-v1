import {
    parseDmyToIsoStrict,
    parseIsoToDateStrict,
} from "@/utils/time/calendar-date";

/**
 * Parse time string (HH:MM or HH:MM:SS) to decimal hours since midnight.
 */

/**
 * Parse date string (YYYY-MM-DD or DD/MM/YYYY) to local calendar Date.
 * Delegates to strict `calendar-date` parsers when the string matches UI/form
 * formats; keeps a narrow lenient branch for single-digit segments (e.g. imports).
 */
function parseDateForHours(dateStr: string): Date | null {
    const s = String(dateStr).trim();

    const strictIso = parseIsoToDateStrict(s);
    if (strictIso) return strictIso;

    const isoFromDmy = parseDmyToIsoStrict(s);
    if (isoFromDmy) {
        return parseIsoToDateStrict(isoFromDmy);
    }

    const isoLoose = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoLoose) {
        const year = parseInt(isoLoose[1]!, 10);
        const month = parseInt(isoLoose[2]!, 10);
        const day = parseInt(isoLoose[3]!, 10);
        const d = new Date(year, month - 1, day);
        if (
            d.getFullYear() === year &&
            d.getMonth() === month - 1 &&
            d.getDate() === day
        ) {
            return d;
        }
    }

    const dmyLoose = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyLoose) {
        const day = parseInt(dmyLoose[1]!, 10);
        const month = parseInt(dmyLoose[2]!, 10);
        const year = parseInt(dmyLoose[3]!, 10);
        const d = new Date(year, month - 1, day);
        if (
            d.getFullYear() === year &&
            d.getMonth() === month - 1 &&
            d.getDate() === day
        ) {
            return d;
        }
    }

    return null;
}

/** Parse time string (HH:MM or HH:MM:SS) to { h, m }. Returns null if invalid. */
function parseTimeForHours(timeStr: string): { h: number; m: number } | null {
    const trimmed = String(timeStr).trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const h = parseInt(match[1]!, 10);
    const m = parseInt(match[2]!, 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { h, m };
}

function clockIntervalDurationMs(
    dateIn: string,
    timeIn: string,
    dateOut: string,
    timeOut: string,
): number | null {
    const dIn = parseDateForHours(dateIn);
    const dOut = parseDateForHours(dateOut);
    const tIn = parseTimeForHours(timeIn);
    const tOut = parseTimeForHours(timeOut);
    if (!dIn || !dOut || !tIn || !tOut) return null;
    const start = new Date(
        dIn.getFullYear(),
        dIn.getMonth(),
        dIn.getDate(),
        tIn.h,
        tIn.m,
    );
    const end = new Date(
        dOut.getFullYear(),
        dOut.getMonth(),
        dOut.getDate(),
        tOut.h,
        tOut.m,
    );
    return end.getTime() - start.getTime();
}

/** True when clock-out is strictly after clock-in (matches {@link calculateHoursFromDateTimes} positive duration). */
export function isClockOutAfterClockIn(
    dateIn: string,
    timeIn: string,
    dateOut: string,
    timeOut: string,
): boolean {
    const diffMs = clockIntervalDurationMs(dateIn, timeIn, dateOut, timeOut);
    return diffMs != null && diffMs > 0;
}

/**
 * Calculate decimal hours worked from full date+time.
 * Handles cross-day and multi-day shifts.
 * Returns 0 when invalid.
 */
function calculateHoursFromDateTimes(
    dateIn: string,
    timeIn: string,
    dateOut: string,
    timeOut: string,
): number {
    const diffMs = clockIntervalDurationMs(dateIn, timeIn, dateOut, timeOut);
    if (diffMs == null || diffMs < 0) return 0;
    const totalMinutes = diffMs / (60 * 1000);
    return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Calculate hours worked from time_in and time_out.
 * Handles overnight (time_out < time_in) by assuming next day.
 */

export interface PayCalcInput {
    employmentType: "Full Time" | "Part Time";
    totalHoursWorked: number;
    minimumWorkingHours: number | null;
    monthlyPay: number | null;
    hourlyRate: number | null;
    restDayRate: number | null;
    restDays: number;
    publicHolidays: number;
}

interface PayCalcResult {
    basePay: number;
    overtimeHours: number;
    overtimePay: number;
    restDayPay: number;
    publicHolidayPay: number;
    earningsTotal: number;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Part-time:  earningsTotal = hourlyRate * totalHoursWorked (no premiums)
 * Full-time:  overtimePay = hourlyRate * overtimeHours
 *             restDayPay  = restDayRate * restDays
 *             publicHolidayPay = restDayRate * publicHolidays
 *             earningsTotal = monthlyPay + overtimePay + restDayPay + publicHolidayPay
 */
export function calculatePay(input: PayCalcInput): PayCalcResult {
    const {
        employmentType,
        totalHoursWorked,
        minimumWorkingHours,
        monthlyPay,
        hourlyRate,
        restDayRate,
        restDays,
        publicHolidays,
    } = input;

    const overtimeHours =
        minimumWorkingHours != null
            ? Math.max(0, totalHoursWorked - minimumWorkingHours)
            : 0;

    if (employmentType === "Part Time") {
        const basePay = roundMoney((hourlyRate ?? 0) * totalHoursWorked);
        return {
            basePay,
            overtimeHours: 0,
            overtimePay: 0,
            restDayPay: 0,
            publicHolidayPay: 0,
            earningsTotal: basePay,
        };
    }

    const publicHolidayPay = roundMoney((restDayRate ?? 0) * publicHolidays);

    const basePay = monthlyPay ?? 0;
    const overtimePay = roundMoney((hourlyRate ?? 0) * overtimeHours);
    const restDayPay = roundMoney((restDayRate ?? 0) * restDays);
    const earningsTotal = roundMoney(
        basePay + overtimePay + restDayPay + publicHolidayPay,
    );

    return {
        basePay,
        overtimeHours,
        overtimePay,
        restDayPay,
        publicHolidayPay,
        earningsTotal,
    };
}
