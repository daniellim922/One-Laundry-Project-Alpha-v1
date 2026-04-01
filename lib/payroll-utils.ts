/**
 * Parse time string (HH:MM or HH:MM:SS) to decimal hours since midnight.
 */
function timeToHours(timeStr: string): number {
    const parts = String(timeStr).split(":").map(Number);
    const hours = parts[0] ?? 0;
    const minutes = (parts[1] ?? 0) / 60;
    const seconds = (parts[2] ?? 0) / 3600;
    return hours + minutes + seconds;
}

/** Parse date string (YYYY-MM-DD or DD/MM/YYYY) to Date. Returns null if invalid. */
function parseDateForHours(dateStr: string): Date | null {
    const s = String(dateStr).trim();
    let year: number;
    let month: number;
    let day: number;
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (isoMatch) {
        year = parseInt(isoMatch[1]!, 10);
        month = parseInt(isoMatch[2]!, 10) - 1;
        day = parseInt(isoMatch[3]!, 10);
    } else if (dmyMatch) {
        day = parseInt(dmyMatch[1]!, 10);
        month = parseInt(dmyMatch[2]!, 10) - 1;
        year = parseInt(dmyMatch[3]!, 10);
    } else {
        return null;
    }
    const d = new Date(year, month, day);
    if (
        d.getFullYear() !== year ||
        d.getMonth() !== month ||
        d.getDate() !== day
    )
        return null;
    return d;
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

/**
 * Calculate decimal hours worked from full date+time.
 * Handles cross-day and multi-day shifts.
 * Returns 0 when invalid.
 */
export function calculateHoursFromDateTimes(
    dateIn: string,
    timeIn: string,
    dateOut: string,
    timeOut: string,
): number {
    const dIn = parseDateForHours(dateIn);
    const dOut = parseDateForHours(dateOut);
    const tIn = parseTimeForHours(timeIn);
    const tOut = parseTimeForHours(timeOut);
    if (!dIn || !dOut || !tIn || !tOut) return 0;
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
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return 0;
    const totalMinutes = diffMs / (60 * 1000);
    return Math.round(totalMinutes / 60 * 100) / 100;
}

/**
 * Calculate hours worked from time_in and time_out.
 * Handles overnight (time_out < time_in) by assuming next day.
 */
export function calculateHoursFromTimes(timeIn: string, timeOut: string): number {
    const inHours = timeToHours(timeIn);
    let outHours = timeToHours(timeOut);
    if (outHours < inHours) {
        outHours += 24; // overnight shift
    }
    return Math.round((outHours - inHours) * 100) / 100;
}

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
    totalPay: number;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Part-time:  totalPay = hourlyRate * totalHoursWorked
 * Full-time:  overtimePay = hourlyRate * overtimeHours
 *             restDayPay  = restDayRate * restDays
 *             totalPay    = monthlyPay + overtimePay + restDayPay + publicHolidayPay
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

    const publicHolidayPay = roundMoney((restDayRate ?? 0) * publicHolidays);

    if (employmentType === "Part Time") {
        const basePay = roundMoney((hourlyRate ?? 0) * totalHoursWorked);
        const totalPay = roundMoney(basePay + publicHolidayPay);
        return {
            basePay,
            overtimeHours: 0,
            overtimePay: 0,
            restDayPay: 0,
            publicHolidayPay,
            totalPay,
        };
    }

    const basePay = monthlyPay ?? 0;
    const overtimePay = roundMoney((hourlyRate ?? 0) * overtimeHours);
    const restDayPay = roundMoney((restDayRate ?? 0) * restDays);
    const totalPay = roundMoney(basePay + overtimePay + restDayPay + publicHolidayPay);

    return {
        basePay,
        overtimeHours,
        overtimePay,
        restDayPay,
        publicHolidayPay,
        totalPay,
    };
}
