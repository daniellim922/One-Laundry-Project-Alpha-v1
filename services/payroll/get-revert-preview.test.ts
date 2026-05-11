import { beforeEach, describe, expect, it, vi } from "vitest";

import { advanceTable } from "@/db/tables/advanceTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { makePayroll } from "@/test/factories/payroll";

const { drizzleAscSpy, drizzleEqSpy, drizzleGteSpy, drizzleLteSpy } = vi.hoisted(
    () => ({
        drizzleAscSpy: vi.fn(),
        drizzleEqSpy: vi.fn(),
        drizzleGteSpy: vi.fn(),
        drizzleLteSpy: vi.fn(),
    }),
);

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
    },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
    const actual = await importOriginal<typeof import("drizzle-orm")>();
    return {
        ...actual,
        asc: (column: unknown) => {
            drizzleAscSpy(column);
            return actual.asc(column as never);
        },
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

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { getPayrollRevertPreview } from "@/services/payroll/get-revert-preview";

function mockRevertPreviewChains(options: {
    payrollRow: unknown[];
    timesheetRows: unknown[];
    advanceRows: unknown[];
}) {
    mocks.db.select.mockImplementation(() => ({
        from: vi.fn((table: unknown) => {
            if (table === payrollTable) {
                return {
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue(options.payrollRow),
                    }),
                };
            }
            if (table === timesheetTable) {
                return {
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(options.timesheetRows),
                    }),
                };
            }
            if (table === advanceTable) {
                return {
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(options.advanceRows),
                    }),
                };
            }
            throw new Error("Unexpected select().from() table in revert preview test");
        }),
    }));
}

describe("getPayrollRevertPreview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns NOT_FOUND when payroll does not exist", async () => {
        mockRevertPreviewChains({
            payrollRow: [],
            timesheetRows: [],
            advanceRows: [],
        });

        await expect(getPayrollRevertPreview("missing")).resolves.toEqual({
            error: "Payroll not found",
            code: "NOT_FOUND",
        });
    });

    it("returns INVALID_STATE when payroll is not Settled", async () => {
        mockRevertPreviewChains({
            payrollRow: [makePayroll({ id: "p1", status: "Draft" })],
            timesheetRows: [],
            advanceRows: [],
        });

        await expect(getPayrollRevertPreview("p1")).resolves.toEqual({
            error: "Only Settled payrolls can be previewed for revert",
            code: "INVALID_STATE",
        });
    });

    it("returns payroll-only preview when there are no paid timesheets or paid installments", async () => {
        mockRevertPreviewChains({
            payrollRow: [
                makePayroll({
                    id: "p1",
                    status: "Settled",
                    workerId: "w1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                }),
            ],
            timesheetRows: [],
            advanceRows: [
                {
                    id: "a1",
                    advanceRequestId: "r1",
                    status: "Installment Loan",
                    amount: 50,
                    repaymentDate: "2026-01-10",
                },
            ],
        });

        await expect(getPayrollRevertPreview("p1")).resolves.toEqual({
            data: [
                {
                    name: "Payroll",
                    currentStatus: "Settled",
                    futureStatus: "Draft",
                },
            ],
        });
        expect(drizzleEqSpy).toHaveBeenCalledWith(timesheetTable.workerId, "w1");
        expect(drizzleGteSpy).toHaveBeenCalledWith(
            timesheetTable.dateIn,
            "2026-01-01",
        );
        expect(drizzleLteSpy).toHaveBeenCalledWith(
            timesheetTable.dateOut,
            "2026-01-31",
        );
        expect(drizzleEqSpy).toHaveBeenCalledWith(
            timesheetTable.status,
            "Timesheet Paid",
        );
        expect(drizzleAscSpy).toHaveBeenCalledWith(timesheetTable.dateIn);
    });

    it("includes Timesheets block only for Timesheet Paid rows in period", async () => {
        mockRevertPreviewChains({
            payrollRow: [
                makePayroll({
                    id: "p1",
                    status: "Settled",
                    workerId: "w1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                }),
            ],
            timesheetRows: [
                {
                    id: "t1",
                    dateIn: "2026-01-10",
                    dateOut: "2026-01-10",
                    timeIn: "09:00:00",
                    timeOut: "17:00:00",
                    hours: 8,
                },
            ],
            advanceRows: [],
        });

        await expect(getPayrollRevertPreview("p1")).resolves.toEqual({
            data: [
                {
                    name: "Payroll",
                    currentStatus: "Settled",
                    futureStatus: "Draft",
                },
                {
                    name: "Timesheets (1)",
                    currentStatus: "Timesheet Paid",
                    futureStatus: "Timesheet Unpaid",
                    timesheetLines: [
                        {
                            id: "t1",
                            dateIn: "2026-01-10",
                            dateOut: "2026-01-10",
                            timeIn: "09:00:00",
                            timeOut: "17:00:00",
                            hours: 8,
                        },
                    ],
                },
            ],
        });
    });

    it("includes Advance block for Installment Paid rows sorted by repayment date", async () => {
        mockRevertPreviewChains({
            payrollRow: [
                makePayroll({
                    id: "p1",
                    status: "Settled",
                    workerId: "w1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                }),
            ],
            timesheetRows: [],
            advanceRows: [
                {
                    id: "a2",
                    advanceRequestId: "r2",
                    status: "Installment Paid",
                    amount: 30,
                    repaymentDate: "2026-01-20",
                },
                {
                    id: "a1",
                    advanceRequestId: "r1",
                    status: "Installment Paid",
                    amount: 40,
                    repaymentDate: "2026-01-05",
                },
                {
                    id: "a3",
                    advanceRequestId: "r3",
                    status: "Installment Loan",
                    amount: 99,
                    repaymentDate: "2026-01-15",
                },
            ],
        });

        await expect(getPayrollRevertPreview("p1")).resolves.toEqual({
            data: [
                {
                    name: "Payroll",
                    currentStatus: "Settled",
                    futureStatus: "Draft",
                },
                {
                    name: "Advance (2)",
                    currentStatus: "Installment Paid",
                    futureStatus: "Installment Loan",
                    advanceInstallmentLines: [
                        {
                            id: "a1",
                            advanceRequestId: "r1",
                            amount: 40,
                            repaymentDate: "2026-01-05",
                        },
                        {
                            id: "a2",
                            advanceRequestId: "r2",
                            amount: 30,
                            repaymentDate: "2026-01-20",
                        },
                    ],
                },
            ],
        });
    });
});
