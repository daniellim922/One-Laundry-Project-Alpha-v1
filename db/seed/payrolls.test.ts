import { describe, expect, it } from "vitest";

import {
    FOREIGN_FULL_TIME_LIVE_MINIMUM_HOURS,
    FOREIGN_FULL_TIME_MISS_MONTHS,
    FOREIGN_FULL_TIME_OVERTIME_BAND,
    getVoucherMinimumWorkingHours,
    isForeignFullTimeWorker,
    isLocalFullTimeWorker,
} from "./minimum-hours";
import { payrolls } from "./payrolls";
import { seedPeriods } from "./periods";
import { timesheets } from "./timesheet";
import { workers } from "./workers";

describe("seedPeriods", () => {
    it("covers April 2025 through March 2026 without gaps", () => {
        expect(seedPeriods.map((period) => period.key)).toEqual([
            "2025-04",
            "2025-05",
            "2025-06",
            "2025-07",
            "2025-08",
            "2025-09",
            "2025-10",
            "2025-11",
            "2025-12",
            "2026-01",
            "2026-02",
            "2026-03",
        ]);
    });
});

describe("timesheet seed backbone", () => {
    it("gives every worker coverage in every seeded month", () => {
        const monthCoverage = new Set(
            timesheets.map((entry) => `${entry.workerIndex}:${entry.dateIn.slice(0, 7)}`),
        );

        for (const period of seedPeriods) {
            for (const [workerIndex] of workers.entries()) {
                expect(monthCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
            }
        }
    });
});

describe("payroll seed backbone", () => {
    it("creates one deterministic payroll per worker per month", () => {
        expect(payrolls).toHaveLength(seedPeriods.length * workers.length);

        const payrollCoverage = new Set(
            payrolls.map((payroll) => `${payroll.workerIndex}:${payroll.periodStart.slice(0, 7)}`),
        );

        for (const period of seedPeriods) {
            for (const [workerIndex] of workers.entries()) {
                expect(payrollCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
            }
        }

        expect(payrolls[0]?.voucher.voucherNumber).toBe(1);
        expect(payrolls.at(-1)?.voucher.voucherNumber).toBe(
            (seedPeriods.length - 1) * 1000 + workers.length,
        );
    });
});

describe("phase 2 minimum-hours attainment", () => {
    it("normalizes foreign full-time worker employment terms to the live baseline", () => {
        const foreignFullTimeWorkers = workers.filter(isForeignFullTimeWorker);

        expect(foreignFullTimeWorkers.length).toBeGreaterThan(0);

        for (const worker of foreignFullTimeWorkers) {
            expect(
                "minimumWorkingHours" in worker
                    ? worker.minimumWorkingHours ?? null
                    : null,
            ).toBe(
                FOREIGN_FULL_TIME_LIVE_MINIMUM_HOURS,
            );
        }
    });

    it("keeps local full-time workers outside minimum-hours enforcement", () => {
        const localFullTimeWorkers = workers.filter(isLocalFullTimeWorker);

        expect(localFullTimeWorkers.length).toBeGreaterThan(0);

        for (const worker of localFullTimeWorkers) {
            expect(
                "minimumWorkingHours" in worker
                    ? worker.minimumWorkingHours ?? null
                    : null,
            ).toBeNull();
        }

        const localFullTimePayrolls = payrolls.filter((payroll) =>
            isLocalFullTimeWorker(workers[payroll.workerIndex]!),
        );

        for (const payroll of localFullTimePayrolls) {
            expect(payroll.voucher.minimumWorkingHours).toBeNull();
            expect(payroll.voucher.hoursNotMet).toBeNull();
        }
    });

    it("snapshots 250/260 month targets into foreign full-time payroll vouchers", () => {
        const foreignFullTimePayrolls = payrolls.filter((payroll) =>
            isForeignFullTimeWorker(workers[payroll.workerIndex]!),
        );

        for (const payroll of foreignFullTimePayrolls) {
            const period = seedPeriods.find(
                (candidate) => candidate.periodStart === payroll.periodStart,
            );

            expect(period).toBeDefined();
            expect(payroll.voucher.minimumWorkingHours).toBe(
                getVoucherMinimumWorkingHours(period!),
            );
        }
    });

    it("keeps most foreign full-time worker-months slightly above target and limits misses to three fixed months", () => {
        const actualMisses = new Set<string>();
        let attainedCount = 0;

        for (const payroll of payrolls) {
            const worker = workers[payroll.workerIndex]!;
            if (!isForeignFullTimeWorker(worker)) {
                continue;
            }

            const monthKey = payroll.periodStart.slice(0, 7);
            const actualTotalHours = Math.round(
                timesheets
                    .filter(
                        (entry) =>
                            entry.workerIndex === payroll.workerIndex &&
                            entry.dateIn.startsWith(monthKey),
                    )
                    .reduce((sum, entry) => sum + entry.hours, 0) * 100,
            ) / 100;

            expect(actualTotalHours).toBe(payroll.voucher.totalHoursWorked);

            const target = payroll.voucher.minimumWorkingHours!;
            const delta = Math.round((actualTotalHours - target) * 100) / 100;
            const key = `${payroll.workerIndex}:${monthKey}`;

            if (delta < 0) {
                actualMisses.add(key);
                expect(FOREIGN_FULL_TIME_MISS_MONTHS.has(key)).toBe(true);
                expect(payroll.voucher.hoursNotMet).toBe(delta);
                expect(payroll.voucher.overtimeHours).toBe(0);
                continue;
            }

            attainedCount += 1;
            expect(delta).toBeGreaterThanOrEqual(
                FOREIGN_FULL_TIME_OVERTIME_BAND.min,
            );
            expect(delta).toBeLessThanOrEqual(
                FOREIGN_FULL_TIME_OVERTIME_BAND.max,
            );
            expect(payroll.voucher.hoursNotMet).toBe(0);
            expect(payroll.voucher.overtimeHours).toBe(delta);
        }

        expect(actualMisses).toEqual(new Set(FOREIGN_FULL_TIME_MISS_MONTHS.keys()));
        expect(actualMisses.size).toBe(3);
        expect(attainedCount).toBeGreaterThan(actualMisses.size);
    });
});
