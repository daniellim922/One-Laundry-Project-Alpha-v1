/**
 * Timesheet seed entries for April 2025 through March 2026.
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 */

import {
    getForeignFullTimeHoursDelta,
    getVoucherMinimumWorkingHours,
    isForeignFullTimeWorker,
} from "./minimum-hours";
import { seedPeriods } from "./periods";
import { workers } from "./workers";

type TimesheetEntry = {
    workerIndex: number;
    dateIn: string;
    timeIn: string;
    dateOut: string;
    timeOut: string;
    hours: number;
};

function seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pad(n: number): string {
    return n.toString().padStart(2, "0");
}

function roundTo15(totalMinutes: number): { h: number; m: number } {
    const rounded = Math.round(totalMinutes / 15) * 15;
    return { h: Math.floor(rounded / 60), m: rounded % 60 };
}

function formatTime(h: number, m: number): string {
    return `${pad(h)}:${pad(m)}:00`;
}

function formatDate(year: number, month: number, day: number): string {
    return `${year}-${pad(month)}-${pad(day)}`;
}

function distributeHours(totalHours: number, dayCount: number): number[] {
    const totalQuarterHours = Math.round(totalHours * 4);
    const baseQuarterHours = Math.floor(totalQuarterHours / dayCount);
    let remainder = totalQuarterHours - baseQuarterHours * dayCount;

    return Array.from({ length: dayCount }, () => {
        const quarterHours = baseQuarterHours + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        return quarterHours / 4;
    });
}

function generateTimesheets(): TimesheetEntry[] {
    const rand = seededRandom(42);
    const entries: TimesheetEntry[] = [];

    for (const period of seedPeriods) {
        const workingDays: number[] = [];

        for (let day = 1; day <= Number(period.periodEnd.slice(-2)); day += 1) {
            if (new Date(Date.UTC(period.year, period.month - 1, day)).getUTCDay() !== 0) {
                workingDays.push(day);
            }
        }

        for (const [workerIndex, worker] of workers.entries()) {
            const isPartTime = worker.employmentType === "Part Time";
            const isForeignFullTime = isForeignFullTimeWorker(worker);

            if (isPartTime) {
                const dayCount = 12 + Math.floor(rand() * 5);
                const shuffled = [...workingDays].sort(() => rand() - 0.5);
                const selectedDays = shuffled
                    .slice(0, Math.min(dayCount, workingDays.length))
                    .sort((a, b) => a - b);

                for (const day of selectedDays) {
                    const clockIn = roundTo15(480 + Math.floor(rand() * 121));
                    const duration = roundTo15(240 + Math.floor(rand() * 121));
                    const outMin =
                        clockIn.h * 60 + clockIn.m + duration.h * 60 + duration.m;
                    const clockOut = {
                        h: Math.floor(outMin / 60),
                        m: outMin % 60,
                    };

                    entries.push({
                        workerIndex,
                        dateIn: formatDate(period.year, period.month, day),
                        timeIn: formatTime(clockIn.h, clockIn.m),
                        dateOut: formatDate(period.year, period.month, day),
                        timeOut: formatTime(clockOut.h, clockOut.m),
                        hours: (duration.h * 60 + duration.m) / 60,
                    });
                }

                continue;
            }

            if (isForeignFullTime) {
                const monthlyTarget = getVoucherMinimumWorkingHours(period);
                const totalHours =
                    monthlyTarget +
                    getForeignFullTimeHoursDelta(workerIndex, period);
                const dailyHours = distributeHours(totalHours, workingDays.length);

                for (const [dayIndex, day] of workingDays.entries()) {
                    const clockIn = roundTo15(420 + Math.floor(rand() * 91));
                    const durationMinutes = Math.round(dailyHours[dayIndex]! * 60);
                    const outMin =
                        clockIn.h * 60 + clockIn.m + durationMinutes;
                    const clockOut = { h: Math.floor(outMin / 60), m: outMin % 60 };

                    entries.push({
                        workerIndex,
                        dateIn: formatDate(period.year, period.month, day),
                        timeIn: formatTime(clockIn.h, clockIn.m),
                        dateOut: formatDate(period.year, period.month, day),
                        timeOut: formatTime(clockOut.h, clockOut.m),
                        hours: dailyHours[dayIndex]!,
                    });
                }

                continue;
            }

            const missCount = 1 + Math.floor(rand() * 3);
            const missedDays = new Set<number>();

            while (
                missedDays.size < Math.min(missCount, Math.max(1, workingDays.length - 1))
            ) {
                missedDays.add(workingDays[Math.floor(rand() * workingDays.length)]);
            }

            for (const day of workingDays) {
                if (missedDays.has(day)) {
                    continue;
                }

                const clockIn = roundTo15(420 + Math.floor(rand() * 91));
                const duration = roundTo15(480 + Math.floor(rand() * 121));
                const outMin =
                    clockIn.h * 60 + clockIn.m + duration.h * 60 + duration.m;
                const clockOut = { h: Math.floor(outMin / 60), m: outMin % 60 };

                entries.push({
                    workerIndex,
                    dateIn: formatDate(period.year, period.month, day),
                    timeIn: formatTime(clockIn.h, clockIn.m),
                    dateOut: formatDate(period.year, period.month, day),
                    timeOut: formatTime(clockOut.h, clockOut.m),
                    hours: (duration.h * 60 + duration.m) / 60,
                });
            }
        }
    }

    return entries;
}

export const timesheets = generateTimesheets();
