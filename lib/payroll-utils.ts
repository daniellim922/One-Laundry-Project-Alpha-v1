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

/**
 * Standard hours per month for overtime calculation (22 days * 8 hours).
 */
export const STANDARD_HOURS_PER_MONTH = 176;

/**
 * Overtime multiplier (1.5x).
 */
export const OT_MULTIPLIER = 1.5;

/**
 * Calculate pay for a worker based on total hours.
 * - Hourly: total_hours * hourlyPay
 * - Monthly: base salary + overtime (hours beyond 8/day at 1.5x based on monthly rate)
 */
export function calculatePay(
    totalHours: number,
    dailyHours: number[],
    monthlyPay: number | null,
    hourlyPay: number | null,
): { basePay: number; overtimePay: number; totalPay: number; breakdown: string } {
    if (hourlyPay != null) {
        const totalPay = Math.round(totalHours * hourlyPay);
        return {
            basePay: totalPay,
            overtimePay: 0,
            totalPay,
            breakdown: `${totalHours.toFixed(2)} hrs × $${hourlyPay} = $${totalPay}`,
        };
    }
    if (monthlyPay != null) {
        const basePay = monthlyPay;
        const hourlyRate = monthlyPay / STANDARD_HOURS_PER_MONTH;
        let overtimeHours = 0;
        for (const h of dailyHours) {
            if (h > 8) overtimeHours += h - 8;
        }
        const overtimePay = Math.round(
            overtimeHours * hourlyRate * OT_MULTIPLIER,
        );
        const totalPay = basePay + overtimePay;
        const breakdown =
            overtimeHours > 0
                ? `Base: $${basePay} + OT (${overtimeHours.toFixed(2)} hrs × $${hourlyRate.toFixed(2)} × 1.5) = $${totalPay}`
                : `Monthly salary: $${basePay}`;
        return {
            basePay,
            overtimePay,
            totalPay,
            breakdown,
        };
    }
    return {
        basePay: 0,
        overtimePay: 0,
        totalPay: 0,
        breakdown: "No pay rate configured",
    };
}
