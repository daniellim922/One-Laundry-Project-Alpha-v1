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
