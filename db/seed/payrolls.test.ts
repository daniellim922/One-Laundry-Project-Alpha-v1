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

const EXCEPTION_LOCAL_NAMES = ["ALVIS ONG THAI YING", "ONG CHONG WEE"];
import { payrolls } from "./payrolls";
import {
    openTimesheetSeedPeriods,
    settledHistoricalPayrollSeedPeriods,
} from "./periods";
import { timesheets } from "./timesheet";
import { workers } from "./workers";
import { computeRestDaysForPayrollPeriod } from "@/utils/payroll/missing-timesheet-dates";
import { publicHolidays } from "./public-holidays";

const payrollSeedPeriods = settledHistoricalPayrollSeedPeriods;

describe("seedPeriods", () => {
    it("covers April through December 2025 without gaps for settled payroll history", () => {
        expect(payrollSeedPeriods.map((period) => period.key)).toEqual([
            "2025-04",
            "2025-05",
            "2025-06",
            "2025-07",
            "2025-08",
            "2025-09",
            "2025-10",
            "2025-11",
            "2025-12",
        ]);
    });

    it("excludes January through March 2026 from the settled payroll seed window", () => {
        expect(
            payrollSeedPeriods.some((period) => period.key.startsWith("2026-")),
        ).toBe(false);
    });
});

describe("timesheet seed backbone", () => {
    it("gives every worker coverage in every seeded month", () => {
        const monthCoverage = new Set(
            timesheets.map((entry) => `${entry.workerIndex}:${entry.dateIn.slice(0, 7)}`),
        );

        for (const period of payrollSeedPeriods) {
            for (const [workerIndex, worker] of workers.entries()) {
                const shouldHaveTimesheets =
                    !isLocalFullTimeWorker(worker) ||
                    EXCEPTION_LOCAL_NAMES.includes(worker.name);

                if (shouldHaveTimesheets) {
                    expect(monthCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
                }
            }
        }
    });

    it("produces no Jan-Mar 2026 timesheet rows", () => {
        expect(
            timesheets.some((entry) => {
                const monthKey = entry.dateIn.slice(0, 7);
                return monthKey >= "2026-01" && monthKey <= "2026-03";
            }),
        ).toBe(false);
    });
});

describe("payroll seed backbone", () => {
    it("creates one deterministic payroll per worker per settled historical payroll month", () => {
        expect(payrolls).toHaveLength(payrollSeedPeriods.length * workers.length);

        const payrollCoverage = new Set(
            payrolls.map((payroll) => `${payroll.workerIndex}:${payroll.periodStart.slice(0, 7)}`),
        );

        for (const period of payrollSeedPeriods) {
            for (const [workerIndex] of workers.entries()) {
                expect(payrollCoverage.has(`${workerIndex}:${period.key}`)).toBe(true);
            }
        }

        expect(payrolls[0]?.voucher.voucherNumber).toBe("2025-0001");
        expect(payrolls.at(-1)?.voucher.voucherNumber).toBe(
            `2025-${String(payrollSeedPeriods.length * workers.length).padStart(4, "0")}`,
        );
    });

    it("keeps payroll and voucher seeds out of the open timesheet window", () => {
        const openTimesheetMonthKeys = new Set(
            openTimesheetSeedPeriods.map((period) => period.key),
        );

        const openWindowPayrolls = payrolls.filter((payroll) =>
            openTimesheetMonthKeys.has(payroll.periodStart.slice(0, 7)),
        );

        expect(openWindowPayrolls).toHaveLength(0);
        expect(
            payrolls.every((payroll) => payroll.voucher.voucherNumber.startsWith("2025-")),
        ).toBe(true);
    });

    it("seeds only Settled payrolls and no Draft payrolls", () => {
        expect(payrolls.every((payroll) => payroll.status === "Settled")).toBe(true);
        expect(payrolls.some((payroll) => payroll.status === "Draft")).toBe(false);
    });

    it("derives voucher restDays from seeded attendance coverage using the live missing-date rule", () => {
        for (const payroll of payrolls) {
            const presentDateInKeys = timesheets
                .filter(
                    (entry) =>
                        entry.workerIndex === payroll.workerIndex &&
                        entry.dateIn >= payroll.periodStart &&
                        entry.dateIn <= payroll.periodEnd,
                )
                .map((entry) => entry.dateIn);

            expect(payroll.voucher.restDays).toBe(
                computeRestDaysForPayrollPeriod({
                    periodStart: payroll.periodStart,
                    periodEnd: payroll.periodEnd,
                    presentDateInKeys,
                }),
            );
        }
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
            const period = payrollSeedPeriods.find(
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
            quarterlyAdvanceCohortWorkerIndexes.length * (payrollSeedPeriods.length / 3),
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
                payrollSeedPeriods.findIndex(
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
                    payrollSeedPeriods.findIndex(
                        (period) =>
                            period.key === installment.installmentDate.slice(0, 7),
                    ) / 3,
                );

                expect(installmentQuarter).toBe(requestQuarter);
            }
        }
    });

    it("is deterministic and feeds the correct payroll advance deductions", () => {
        const expectedRequests = payrollSeedPeriods
            .filter((_, periodIndex) => periodIndex % 3 === 0)
            .flatMap((period) =>
            quarterlyAdvanceCohortWorkerIndexes.map((workerIndex) => ({
                workerIndex,
                requestDate: `${period.key}-05`,
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

    it("produces no Jan-Mar 2026 advances or installments", () => {
        expect(
            advances.some(
                (advance) =>
                    (advance.dateRequested >= "2026-01-01" &&
                        advance.dateRequested <= "2026-03-31") ||
                    advance.repaymentTerms.some(
                        (term) =>
                            term.installmentDate >= "2026-01-01" &&
                            term.installmentDate <= "2026-03-31",
                    ),
            ),
        ).toBe(false);
    });
});

describe("public holiday calculations", () => {
    it("assigns publicHolidays > 0 to foreign full-time workers in months with PH dates", () => {
        const april2025Payrolls = payrolls.filter(
            (p) => p.periodStart.slice(0, 7) === "2025-04" &&
                isForeignFullTimeWorker(workers[p.workerIndex]!),
        );

        expect(april2025Payrolls.length).toBeGreaterThan(0);

        for (const payroll of april2025Payrolls) {
            expect(payroll.voucher.publicHolidays).toBeGreaterThan(0);
        }
    });

    it("gives zero-timesheet local full-time workers base-pay-only vouchers with PH pay", () => {
        const EXCEPTION_LOCAL_NAMES = ["ALVIS ONG THAI YING", "ONG CHONG WEE"];
        const zeroTimesheetLocals = payrolls.filter((p) => {
            const worker = workers[p.workerIndex]!;
            return (
                isLocalFullTimeWorker(worker) &&
                !EXCEPTION_LOCAL_NAMES.includes(worker.name)
            );
        });

        expect(zeroTimesheetLocals.length).toBeGreaterThan(0);

        for (const payroll of zeroTimesheetLocals) {
            expect(payroll.voucher.totalHoursWorked).toBe(0);
            expect(payroll.voucher.overtimeHours).toBe(0);
            expect(payroll.voucher.overtimePay).toBe(0);
            expect(payroll.voucher.restDays).toBe(0);
            expect(payroll.voucher.restDayPay).toBe(0);

            const phDatesInMonth = publicHolidays.filter(
                (h) =>
                    h.date >= payroll.periodStart && h.date <= payroll.periodEnd,
            );
            expect(payroll.voucher.publicHolidays).toBe(phDatesInMonth.length);

            if (phDatesInMonth.length > 0) {
                expect(payroll.voucher.publicHolidayPay).toBeGreaterThan(0);
            }
        }
    });

    it("computes exact publicHolidays for foreign full-time workers matching all PH dates in period", () => {
        for (const period of payrollSeedPeriods) {
            const phDatesInPeriod = publicHolidays.filter(
                (h) => h.date >= period.periodStart && h.date <= period.periodEnd,
            );

            const foreignFtPayrolls = payrolls.filter(
                (p) =>
                    p.periodStart === period.periodStart &&
                    isForeignFullTimeWorker(workers[p.workerIndex]!),
            );

            for (const payroll of foreignFtPayrolls) {
                expect(payroll.voucher.publicHolidays).toBe(
                    phDatesInPeriod.length,
                );
                expect(payroll.voucher.publicHolidayPay).toBe(
                    Math.round(
                        (payroll.voucher.restDayRate ?? 0) *
                            phDatesInPeriod.length *
                            100,
                    ) / 100,
                );
            }
        }
    });

    it("derives exception local publicHolidays from their timesheet coverage only", () => {
        const EXCEPTION_LOCAL_NAMES = ["ALVIS ONG THAI YING", "ONG CHONG WEE"];
        const exceptionLocalPayrolls = payrolls.filter((p) => {
            const worker = workers[p.workerIndex]!;
            return (
                isLocalFullTimeWorker(worker) &&
                EXCEPTION_LOCAL_NAMES.includes(worker.name)
            );
        });

        expect(exceptionLocalPayrolls.length).toBeGreaterThan(0);

        for (const payroll of exceptionLocalPayrolls) {
            const presentDateInKeys = timesheets
                .filter(
                    (entry) =>
                        entry.workerIndex === payroll.workerIndex &&
                        entry.dateIn >= payroll.periodStart &&
                        entry.dateIn <= payroll.periodEnd,
                )
                .map((entry) => entry.dateIn);

            const presentSet = new Set(presentDateInKeys);
            const phDatesInPeriod = publicHolidays.filter(
                (h) =>
                    h.date >= payroll.periodStart &&
                    h.date <= payroll.periodEnd,
            );
            const expectedPublicHolidays = phDatesInPeriod.filter((h) =>
                presentSet.has(h.date),
            ).length;

            expect(payroll.voucher.publicHolidays).toBe(expectedPublicHolidays);
        }
    });

    it("computes zero-timesheet local publicHolidayPay from monthlyPay / periodWorkingDays", () => {
        const EXCEPTION_LOCAL_NAMES = ["ALVIS ONG THAI YING", "ONG CHONG WEE"];
        const zeroTimesheetLocals = payrolls.filter((p) => {
            const worker = workers[p.workerIndex]!;
            return (
                isLocalFullTimeWorker(worker) &&
                !EXCEPTION_LOCAL_NAMES.includes(worker.name)
            );
        });

        for (const payroll of zeroTimesheetLocals) {
            const phDatesInPeriod = publicHolidays.filter(
                (h) =>
                    h.date >= payroll.periodStart &&
                    h.date <= payroll.periodEnd,
            );
            if (phDatesInPeriod.length === 0) continue;

            const monthlyPay = payroll.voucher.monthlyPay ?? 0;
            const periodStart = payroll.periodStart;
            const periodEnd = payroll.periodEnd;
            const start = new Date(Date.UTC(
                Number(periodStart.slice(0, 4)),
                Number(periodStart.slice(5, 7)) - 1,
                Number(periodStart.slice(8, 10)),
            ));
            const end = new Date(Date.UTC(
                Number(periodEnd.slice(0, 4)),
                Number(periodEnd.slice(5, 7)) - 1,
                Number(periodEnd.slice(8, 10)),
            ));
            let workingDays = 0;
            const cursor = new Date(start);
            while (cursor <= end) {
                if (cursor.getUTCDay() !== 0) workingDays += 1;
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }

            const expectedPublicHolidayPay =
                Math.round((monthlyPay / workingDays) * phDatesInPeriod.length * 100) /
                100;

            expect(payroll.voucher.publicHolidayPay).toBe(
                expectedPublicHolidayPay,
            );
        }
    });
});

describe("phase 4 historical settlement states", () => {
    it("marks all remaining timesheets paid", () => {
        expect(
            timesheets.every((timesheet) => timesheet.status === "Timesheet Paid"),
        ).toBe(true);
    });

    it("marks all seeded advance installments and requests paid", () => {
        for (const advance of advances) {
            expect(
                advance.repaymentTerms.every(
                    (term) => term.status === "Installment Paid",
                ),
            ).toBe(true);
            expect(advance.status).toBe("Advance Paid");
        }
    });
});
