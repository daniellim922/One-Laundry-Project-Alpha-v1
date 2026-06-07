import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { timesheetTable } from "@/db/tables/timesheetTable";
import { timesheetInPayrollWindowWhere } from "@/services/payroll/_shared/payroll-timesheet-window";

describe("timesheetInPayrollWindowWhere", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("keys payroll membership by dateIn, not dateOut", () => {
        timesheetInPayrollWindowWhere({
            workerId: "worker-1",
            periodStart: "2026-05-01",
            periodEnd: "2026-05-31",
        });

        expect(drizzleEqSpy).toHaveBeenCalledWith(
            timesheetTable.workerId,
            "worker-1",
        );
        expect(drizzleGteSpy).toHaveBeenCalledWith(
            timesheetTable.dateIn,
            "2026-05-01",
        );
        expect(drizzleLteSpy).toHaveBeenCalledWith(
            timesheetTable.dateIn,
            "2026-05-31",
        );
        expect(drizzleLteSpy).not.toHaveBeenCalledWith(
            timesheetTable.dateOut,
            "2026-05-31",
        );
    });

    it("adds an optional timesheet status filter", () => {
        timesheetInPayrollWindowWhere({
            workerId: "worker-1",
            periodStart: "2026-05-01",
            periodEnd: "2026-05-31",
            status: "Timesheet Paid",
        });

        expect(drizzleEqSpy).toHaveBeenCalledWith(
            timesheetTable.status,
            "Timesheet Paid",
        );
    });
});
