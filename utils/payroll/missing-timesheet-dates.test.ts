import { describe, expect, it } from "vitest";

import {
    computeRestDaysForPayrollPeriod,
    countMissingTimesheetDateIns,
    countSundaysInPeriod,
    listMissingTimesheetDateIns,
    restDaysFromMissingDateCount,
    timesheetDateInKey,
} from "./missing-timesheet-dates";

describe("timesheetDateInKey", () => {
    it("normalizes ISO date strings", () => {
        expect(timesheetDateInKey("2026-03-15")).toBe("2026-03-15");
    });

    it("normalizes Date objects", () => {
        expect(timesheetDateInKey(new Date(2026, 2, 15))).toBe("2026-03-15");
    });
});

describe("listMissingTimesheetDateIns / countMissingTimesheetDateIns", () => {
    it("counts every calendar day in range without a clock-in", () => {
        const missing = listMissingTimesheetDateIns({
            periodStart: "2026-03-01",
            periodEnd: "2026-03-03",
            presentDateInKeys: [],
        });
        expect(missing).toEqual([
            "2026-03-01",
            "2026-03-02",
            "2026-03-03",
        ]);
        expect(
            countMissingTimesheetDateIns({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-03",
                presentDateInKeys: [],
            }),
        ).toBe(3);
    });

    it("excludes days that have a timesheet dateIn", () => {
        const missing = listMissingTimesheetDateIns({
            periodStart: "2026-03-01",
            periodEnd: "2026-03-04",
            presentDateInKeys: ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"],
        });
        expect(missing).toEqual([]);
        expect(
            countMissingTimesheetDateIns({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-04",
                presentDateInKeys: ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04"],
            }),
        ).toBe(0);
    });

    it("treats partial coverage as missing remaining days", () => {
        expect(
            countMissingTimesheetDateIns({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-04",
                presentDateInKeys: ["2026-03-01", "2026-03-02"],
            }),
        ).toBe(2);
    });
});

describe("countSundaysInPeriod", () => {
    it("counts 4 Sundays in February 2025", () => {
        expect(
            countSundaysInPeriod({
                periodStart: "2025-02-01",
                periodEnd: "2025-02-28",
            }),
        ).toBe(4);
    });

    it("counts 5 Sundays in March 2025", () => {
        expect(
            countSundaysInPeriod({
                periodStart: "2025-03-01",
                periodEnd: "2025-03-31",
            }),
        ).toBe(5);
    });

    it("counts only Sundays within a partial period (mid-month hire)", () => {
        expect(
            countSundaysInPeriod({
                periodStart: "2025-02-15",
                periodEnd: "2025-02-28",
            }),
        ).toBe(2);
    });

    it("returns 0 when the period contains no Sundays", () => {
        expect(
            countSundaysInPeriod({
                periodStart: "2025-01-06",
                periodEnd: "2025-01-08",
            }),
        ).toBe(0);
    });
});

describe("restDaysFromMissingDateCount", () => {
    it("uses budget minus missing count, floored at zero, capped at budget", () => {
        expect(restDaysFromMissingDateCount(0, 4)).toBe(4);
        expect(restDaysFromMissingDateCount(1, 4)).toBe(3);
        expect(restDaysFromMissingDateCount(2, 4)).toBe(2);
        expect(restDaysFromMissingDateCount(3, 4)).toBe(1);
        expect(restDaysFromMissingDateCount(4, 4)).toBe(0);
        expect(restDaysFromMissingDateCount(5, 4)).toBe(0);
    });

    it("adapts to a dynamic budget of 5", () => {
        expect(restDaysFromMissingDateCount(0, 5)).toBe(5);
        expect(restDaysFromMissingDateCount(5, 5)).toBe(0);
        expect(restDaysFromMissingDateCount(6, 5)).toBe(0);
    });

    it("returns 0 for any missing count when budget is 0", () => {
        expect(restDaysFromMissingDateCount(0, 0)).toBe(0);
        expect(restDaysFromMissingDateCount(3, 0)).toBe(0);
    });
});

describe("computeRestDaysForPayrollPeriod", () => {
    it("returns full dynamic budget when every calendar day has a clock-in", () => {
        const args = {
            periodStart: "2025-02-01",
            periodEnd: "2025-02-28",
            presentDateInKeys: Array.from({ length: 28 }, (_, i) =>
                `2025-02-${String(i + 1).padStart(2, "0")}`,
            ),
        };
        expect(computeRestDaysForPayrollPeriod(args)).toBe(4);
    });

    it("returns zero rest days when all days are missing", () => {
        expect(
            computeRestDaysForPayrollPeriod({
                periodStart: "2025-02-01",
                periodEnd: "2025-02-28",
                presentDateInKeys: [],
            }),
        ).toBe(0);
    });

    it("returns the dynamic budget minus missing count for partial attendance", () => {
        // February 2025 has 4 Sundays. Worker present every day except 2 non-Sundays.
        const presentDateInKeys = Array.from({ length: 28 }, (_, i) =>
            `2025-02-${String(i + 1).padStart(2, "0")}`,
        ).filter((d) => d !== "2025-02-03" && d !== "2025-02-04");
        expect(
            computeRestDaysForPayrollPeriod({
                periodStart: "2025-02-01",
                periodEnd: "2025-02-28",
                presentDateInKeys,
            }),
        ).toBe(2);
    });

    it("scales to a 5-Sunday month", () => {
        // March 2025 has 5 Sundays. Full attendance → 5 rest days.
        const args = {
            periodStart: "2025-03-01",
            periodEnd: "2025-03-31",
            presentDateInKeys: Array.from({ length: 31 }, (_, i) =>
                `2025-03-${String(i + 1).padStart(2, "0")}`,
            ),
        };
        expect(computeRestDaysForPayrollPeriod(args)).toBe(5);
    });
});
