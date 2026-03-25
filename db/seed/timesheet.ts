/**
 * Timesheet seed entries for March 2025.
 * workerIndex references the workers array in workers.ts (0-based).
 * Resolved to workerId when seeding.
 *
 * Full-time workers (indices 0-7, 18-31): Mon-Sat, ~8-10 hrs/day.
 * Part-time workers (indices 8-17): Mon-Sat, ~4-6 hrs/day, 12-16 days/month.
 */

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

function formatDate(day: number): string {
    return `2026-03-${pad(day)}`;
}

function generateTimesheets(): TimesheetEntry[] {
    const rand = seededRandom(42);
    const entries: TimesheetEntry[] = [];

    // Mon-Sat working days in March 2025 (Sunday = day-of-week 0)
    const workingDays: number[] = [];
    for (let d = 1; d <= 31; d++) {
        if (new Date(2025, 2, d).getDay() !== 0) workingDays.push(d);
    }

    const FULL_TIME = [
        ...Array.from({ length: 8 }, (_, i) => i),
        ...Array.from({ length: 14 }, (_, i) => i + 18),
    ];
    const PART_TIME = Array.from({ length: 10 }, (_, i) => i + 8);

    for (const wi of FULL_TIME) {
        const missCount = 1 + Math.floor(rand() * 3); // miss 1-3 days
        const missedDays = new Set<number>();
        while (missedDays.size < missCount) {
            missedDays.add(
                workingDays[Math.floor(rand() * workingDays.length)],
            );
        }

        for (const day of workingDays) {
            if (missedDays.has(day)) continue;

            // Clock in 07:00-08:30 → 420-510 min
            const clockIn = roundTo15(420 + Math.floor(rand() * 91));
            // Duration 8-10 hrs (480-600 min)
            const duration = roundTo15(480 + Math.floor(rand() * 121));
            const outMin =
                clockIn.h * 60 + clockIn.m + duration.h * 60 + duration.m;
            const clockOut = { h: Math.floor(outMin / 60), m: outMin % 60 };

            const hours = (duration.h * 60 + duration.m) / 60;

            entries.push({
                workerIndex: wi,
                dateIn: formatDate(day),
                timeIn: formatTime(clockIn.h, clockIn.m),
                dateOut: formatDate(day),
                timeOut: formatTime(clockOut.h, clockOut.m),
                hours,
            });
        }
    }

    for (const wi of PART_TIME) {
        const dayCount = 12 + Math.floor(rand() * 5); // 12-16 days
        const shuffled = [...workingDays].sort(() => rand() - 0.5);
        const selectedDays = shuffled.slice(0, dayCount).sort((a, b) => a - b);

        for (const day of selectedDays) {
            // Clock in 08:00-10:00 → 480-600 min
            const clockIn = roundTo15(480 + Math.floor(rand() * 121));
            // Duration 4-6 hrs (240-360 min)
            const duration = roundTo15(240 + Math.floor(rand() * 121));
            const outMin =
                clockIn.h * 60 + clockIn.m + duration.h * 60 + duration.m;
            const clockOut = { h: Math.floor(outMin / 60), m: outMin % 60 };

            const hours = (duration.h * 60 + duration.m) / 60;

            entries.push({
                workerIndex: wi,
                dateIn: formatDate(day),
                timeIn: formatTime(clockIn.h, clockIn.m),
                dateOut: formatDate(day),
                timeOut: formatTime(clockOut.h, clockOut.m),
                hours,
            });
        }
    }

    return entries;
}

export const timesheets = generateTimesheets();
