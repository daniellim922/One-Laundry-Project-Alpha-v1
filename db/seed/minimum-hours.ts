import type { SeedPeriod } from "./periods";

const FOREIGN_FULL_TIME_OVERTIME_STEPS = [
    2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8,
] as const;

const FOREIGN_FULL_TIME_MISS_MONTHS = new Map<string, number>([
    ["1:2025-06", 4],
    ["6:2025-11", 5],
    ["12:2025-12", 6],
]);

type SeedWorkerShape = {
    employmentType?: string | null;
    employmentArrangement?: string | null;
};

export function isForeignFullTimeWorker(worker: SeedWorkerShape): boolean {
    return (
        worker.employmentType === "Full Time" &&
        worker.employmentArrangement === "Foreign Worker"
    );
}

export function isLocalFullTimeWorker(worker: SeedWorkerShape): boolean {
    return (
        worker.employmentType === "Full Time" &&
        worker.employmentArrangement === "Local Worker"
    );
}

export function getVoucherMinimumWorkingHours(period: SeedPeriod): number {
    return Number(period.periodEnd.slice(-2)) === 31 ? 260 : 250;
}

export function getForeignFullTimeHoursDelta(
    workerIndex: number,
    period: SeedPeriod,
): number {
    const missKey = `${workerIndex}:${period.key}`;
    const missHours = FOREIGN_FULL_TIME_MISS_MONTHS.get(missKey);

    if (missHours != null) {
        return -missHours;
    }

    return FOREIGN_FULL_TIME_OVERTIME_STEPS[
        (workerIndex * 7 + period.monthIndex * 3) %
            FOREIGN_FULL_TIME_OVERTIME_STEPS.length
    ]!;
}
