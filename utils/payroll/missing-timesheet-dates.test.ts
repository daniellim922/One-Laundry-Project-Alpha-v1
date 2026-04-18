import { describe, expect, it } from "vitest";

import {
    REST_DAY_DEFAULT_BUDGET,
    computeRestDaysForPayrollPeriod,
    countMissingTimesheetDateIns,
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

describe("restDaysFromMissingDateCount", () => {
    it("uses REST_DAY_DEFAULT_BUDGET minus missing count, floored at zero, capped at budget", () => {
        expect(REST_DAY_DEFAULT_BUDGET).toBe(4);
        expect(restDaysFromMissingDateCount(0)).toBe(4);
        expect(restDaysFromMissingDateCount(1)).toBe(3);
        expect(restDaysFromMissingDateCount(2)).toBe(2);
        expect(restDaysFromMissingDateCount(3)).toBe(1);
        expect(restDaysFromMissingDateCount(4)).toBe(0);
        expect(restDaysFromMissingDateCount(5)).toBe(0);
    });
});

describe("computeRestDaysForPayrollPeriod", () => {
    it("matches countMissingTimesheetDateIns then restDaysFromMissingDateCount", () => {
        const args = {
            periodStart: "2026-03-01",
            periodEnd: "2026-03-07",
            presentDateInKeys: ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"],
        };
        const missing = countMissingTimesheetDateIns(args);
        expect(computeRestDaysForPayrollPeriod(args)).toBe(
            restDaysFromMissingDateCount(missing),
        );
        expect(missing).toBe(0);
        expect(computeRestDaysForPayrollPeriod(args)).toBe(4);
    });

    it("returns zero rest days when missing count meets or exceeds budget", () => {
        expect(
            computeRestDaysForPayrollPeriod({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-07",
                presentDateInKeys: [],
            }),
        ).toBe(0);
    });

    it("returns intermediate values for partial attendance", () => {
        expect(
            computeRestDaysForPayrollPeriod({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-04",
                presentDateInKeys: ["2026-03-01", "2026-03-02"],
            }),
        ).toBe(2);
    });
});
