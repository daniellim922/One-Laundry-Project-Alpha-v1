import { describe, expect, it } from "vitest";

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
