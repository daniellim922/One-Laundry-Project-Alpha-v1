import { beforeEach, describe, expect, it, vi } from "vitest";

import { payrollTable } from "@/db/tables/payrollTable";

const { drizzleEqSpy, drizzleGteSpy, drizzleLteSpy } = vi.hoisted(() => ({
    drizzleEqSpy: vi.fn(),
    drizzleGteSpy: vi.fn(),
    drizzleLteSpy: vi.fn(),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
    const actual = await importOriginal<typeof import("drizzle-orm")>();
    return {
        ...actual,
        eq: (column: unknown, value: unknown) => {
            drizzleEqSpy(column, value);
            return actual.eq(column as never, value as never);
        },
        gte: (column: unknown, value: unknown) => {
            drizzleGteSpy(column, value);
            return actual.gte(column as never, value as never);
        },
        lte: (column: unknown, value: unknown) => {
            drizzleLteSpy(column, value);
            return actual.lte(column as never, value as never);
        },
    };
});

import { settledPayrollOverlappingYearsWhere } from "@/services/payroll/monthly-dashboard-aggregation";

describe("settledPayrollOverlappingYearsWhere", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("requires Settled status and year-bounded period overlap", () => {
        settledPayrollOverlappingYearsWhere(2025, 2027);

        expect(drizzleEqSpy).toHaveBeenCalledWith(payrollTable.status, "Settled");
        expect(drizzleGteSpy).toHaveBeenCalledWith(
            payrollTable.periodEnd,
            "2025-01-01",
        );
        expect(drizzleLteSpy).toHaveBeenCalledWith(
            payrollTable.periodStart,
            "2027-12-31",
        );
    });
});
