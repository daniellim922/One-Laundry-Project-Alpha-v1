import { describe, expect, it } from "vitest";

import {
    hasInclusivePeriodOverlap,
    validatePayrollPeriodRange,
} from "@/utils/payroll/payroll-period-conflicts";

describe("payroll period conflict helpers", () => {
    it("validates period range ordering", () => {
        expect(
            validatePayrollPeriodRange({
                periodStart: "2026-03-01",
                periodEnd: "2026-03-31",
                payrollDate: "2026-03-31",
            }),
        ).toEqual({ success: true });

        expect(
            validatePayrollPeriodRange({
                periodStart: "2026-03-31",
                periodEnd: "2026-03-01",
                payrollDate: "2026-03-31",
            }),
        ).toEqual({ error: "Period end must be on or after period start" });
    });

    it("rejects payrollDate before periodEnd", () => {
        const result = validatePayrollPeriodRange({
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-03-30",
        });
        expect(result).toEqual({
            error: "Payroll date must be on or after period end",
        });
    });

    it("allows payrollDate equal to periodEnd", () => {
        const result = validatePayrollPeriodRange({
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-03-31",
        });
        expect(result).toEqual({ success: true });
    });

    it("allows payrollDate after periodEnd", () => {
        const result = validatePayrollPeriodRange({
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            payrollDate: "2026-04-05",
        });
        expect(result).toEqual({ success: true });
    });

    it("treats period boundaries as inclusive overlap", () => {
        expect(
            hasInclusivePeriodOverlap({
                existingPeriodStart: "2026-03-01",
                existingPeriodEnd: "2026-03-15",
                candidatePeriodStart: "2026-03-15",
                candidatePeriodEnd: "2026-03-20",
            }),
        ).toBe(true);

        expect(
            hasInclusivePeriodOverlap({
                existingPeriodStart: "2026-03-01",
                existingPeriodEnd: "2026-03-15",
                candidatePeriodStart: "2026-03-16",
                candidatePeriodEnd: "2026-03-31",
            }),
        ).toBe(false);
    });
});

