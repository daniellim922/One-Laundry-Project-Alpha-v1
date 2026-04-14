import { describe, expect, it } from "vitest";

import {
    ADVANCE_COHORT_SIZE,
    QUARTERLY_ADVANCE_AMOUNT,
    QUARTERLY_ADVANCE_INSTALLMENT_AMOUNT,
    advances,
    getAdvanceDeductionForWorkerPeriod,
    quarterlyAdvanceCohortWorkerIndexes,
} from "./advances";
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

describe("phase 3 quarterly advance cohort", () => {
    it("limits seeded advances to the fixed 5-worker foreign full-time cohort", () => {
        expect(quarterlyAdvanceCohortWorkerIndexes).toHaveLength(ADVANCE_COHORT_SIZE);

        const seededWorkerIndexes = new Set(advances.map((advance) => advance.workerIndex));

        expect(seededWorkerIndexes).toEqual(
            new Set(quarterlyAdvanceCohortWorkerIndexes),
        );

        for (const workerIndex of quarterlyAdvanceCohortWorkerIndexes) {
            expect(isForeignFullTimeWorker(workers[workerIndex]!)).toBe(true);
        }

        for (const [workerIndex, worker] of workers.entries()) {
            if (worker.employmentArrangement === "Local Worker") {
                expect(seededWorkerIndexes.has(workerIndex)).toBe(false);
            }
        }
    });

    it("creates one fixed-amount advance per cohort member per quarter with 3 monthly installments", () => {
        expect(advances).toHaveLength(
            quarterlyAdvanceCohortWorkerIndexes.length * (seedPeriods.length / 3),
        );

        for (const advance of advances) {
            expect(advance.amount).toBe(QUARTERLY_ADVANCE_AMOUNT);
            expect(advance.repaymentTerms).toHaveLength(3);
            expect(
                advance.repaymentTerms.reduce(
                    (sum, installment) => sum + installment.installmentAmt,
                    0,
                ),
            ).toBe(QUARTERLY_ADVANCE_AMOUNT);

            const requestQuarter = Math.floor(
                seedPeriods.findIndex(
                    (period) => period.key === advance.dateRequested.slice(0, 7),
                ) / 3,
            );

            expect(requestQuarter).toBeGreaterThanOrEqual(0);

            const repaymentMonths = advance.repaymentTerms.map((term) =>
                term.installmentDate.slice(0, 7),
            );
            expect(new Set(repaymentMonths).size).toBe(3);

            for (const installment of advance.repaymentTerms) {
                expect(installment.installmentAmt).toBe(
                    QUARTERLY_ADVANCE_INSTALLMENT_AMOUNT,
                );
                const installmentQuarter = Math.floor(
                    seedPeriods.findIndex(
                        (period) =>
                            period.key === installment.installmentDate.slice(0, 7),
                    ) / 3,
                );

                expect(installmentQuarter).toBe(requestQuarter);
            }
        }
    });

    it("is deterministic and feeds the correct payroll advance deductions", () => {
        const expectedRequests = [0, 3, 6, 9].flatMap((periodIndex) =>
            quarterlyAdvanceCohortWorkerIndexes.map((workerIndex) => ({
                workerIndex,
                requestDate: `${seedPeriods[periodIndex]!.key}-05`,
            })),
        );

        expect(
            advances.map(({ workerIndex, dateRequested }) => ({
                workerIndex,
                requestDate: dateRequested,
            })),
        ).toEqual(expectedRequests);

        for (const payroll of payrolls) {
            const expectedAdvance = getAdvanceDeductionForWorkerPeriod(
                payroll.workerIndex,
                payroll.periodStart,
            );

            expect(payroll.voucher.advance).toBe(expectedAdvance);

            if (quarterlyAdvanceCohortWorkerIndexes.includes(payroll.workerIndex)) {
                expect([0, QUARTERLY_ADVANCE_INSTALLMENT_AMOUNT]).toContain(
                    payroll.voucher.advance,
                );
            } else {
                expect(payroll.voucher.advance).toBe(0);
            }
        }
    });
});
