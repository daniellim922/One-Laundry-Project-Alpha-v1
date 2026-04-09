import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdvance, makePayroll } from "@/test/fixtures/payroll-fixtures";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    requirePermission: vi.fn(),
    db: {
        select: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("@/utils/permissions/require-permission", () => ({
    requirePermission: (...args: unknown[]) => mocks.requirePermission(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { settlePayroll, revertPayroll, getRevertPreview } from "@/app/dashboard/payroll/actions";

describe("settlePayroll", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requirePermission.mockResolvedValue(undefined);
    });

    it("returns error when payroll is missing", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        const result = await settlePayroll("missing");

        expect(result).toEqual({ error: "Payroll not found" });
    });

    it("returns error when payroll is not Draft", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Settled" })]),
                }),
            }),
        });

        const result = await settlePayroll("payroll-1");
        expect(result).toEqual({ error: "Only Draft payrolls can be settled" });
    });

    it("settles payroll and revalidates routes", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll()]),
                }),
            }),
        });

        const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
        const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere });
        const txUpdate = vi.fn().mockReturnValue({ set: txUpdateSet });

        const advancesInPeriod = [
            makeAdvance({ id: "adv-1", advanceRequestId: "req-1", status: "Installment Loan" }),
            makeAdvance({ id: "adv-2", advanceRequestId: "req-2", status: "Installment Paid" }),
        ];
        const requestAdvances = [
            { advanceRequestId: "req-1", status: "Installment Paid" as const },
            { advanceRequestId: "req-2", status: "Installment Loan" as const },
        ];

        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(advancesInPeriod),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(requestAdvances),
                }),
            });

        mocks.db.transaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<void>) =>
            cb({
                update: txUpdate,
                select: txSelect,
            }),
        );

        const result = await settlePayroll("payroll-1");

        expect(result).toEqual({ success: true });
        expect(mocks.requirePermission).toHaveBeenCalledWith("Payroll", "update");
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);

        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/payroll-1/breakdown");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/payroll-1/summary");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/all");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance/all");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/timesheet");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/timesheet/all");
        expect(txUpdate).toHaveBeenCalled();
    });
});

describe("revertPayroll", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requirePermission.mockResolvedValue(undefined);
    });

    it("returns error when payroll is missing", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        const result = await revertPayroll("missing");

        expect(result).toEqual({ error: "Payroll not found" });
    });

    it("returns error when payroll is not Settled", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Draft" })]),
                }),
            }),
        });

        const result = await revertPayroll("payroll-1");
        expect(result).toEqual({ error: "Only Settled payrolls can be reverted" });
    });

    it("reverts payroll and revalidates routes", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Settled" })]),
                }),
            }),
        });

        const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
        const txUpdateSet = vi.fn().mockReturnValue({ where: txUpdateWhere });
        const txUpdate = vi.fn().mockReturnValue({ set: txUpdateSet });

        const advancesInPeriod = [
            makeAdvance({ id: "adv-1", advanceRequestId: "req-1", status: "Installment Paid" }),
            makeAdvance({ id: "adv-2", advanceRequestId: "req-2", status: "Installment Loan" }),
        ];
        const requestAdvances = [
            { advanceRequestId: "req-1", status: "Installment Loan" as const },
            { advanceRequestId: "req-2", status: "Installment Loan" as const },
        ];

        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(advancesInPeriod),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(requestAdvances),
                }),
            });

        mocks.db.transaction.mockImplementationOnce(async (cb: (tx: unknown) => Promise<void>) =>
            cb({
                update: txUpdate,
                select: txSelect,
            }),
        );

        const result = await revertPayroll("payroll-1");

        expect(result).toEqual({ success: true });
        expect(mocks.requirePermission).toHaveBeenCalledWith("Payroll", "update");
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);

        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/payroll-1/breakdown");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/payroll-1/summary");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/payroll/all");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/advance/all");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/timesheet");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/timesheet/all");
        expect(txUpdate).toHaveBeenCalled();
    });
});

describe("getRevertPreview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requirePermission.mockResolvedValue(undefined);
    });

    it("returns error when payroll not found", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        const result = await getRevertPreview("missing");
        expect(result).toEqual({ error: "Payroll not found" });
    });

    it("returns error when payroll is not Settled", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Draft" })]),
                }),
            }),
        });

        const result = await getRevertPreview("payroll-1");
        expect(result).toEqual({
            error: "Only Settled payrolls can be previewed for revert",
        });
    });

    it("returns preview with all 4 row types when all entities are affected", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Settled" })]),
                }),
            }),
        });

        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([
                        {
                            id: "ts-1",
                            dateIn: "2025-03-01",
                            dateOut: "2025-03-01",
                            timeIn: "09:00:00",
                            timeOut: "17:00:00",
                            hours: 8,
                        },
                        {
                            id: "ts-2",
                            dateIn: "2025-03-02",
                            dateOut: "2025-03-02",
                            timeIn: "08:30:00",
                            timeOut: "16:00:00",
                            hours: 7.5,
                        },
                        {
                            id: "ts-3",
                            dateIn: "2025-03-03",
                            dateOut: "2025-03-04",
                            timeIn: "10:00:00",
                            timeOut: "19:00:00",
                            hours: 9,
                        },
                    ]),
                }),
            }),
        });

        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        makeAdvance({
                            id: "adv-1",
                            advanceRequestId: "req-1",
                            status: "Installment Paid",
                            amount: 40,
                            repaymentDate: "2025-03-10",
                        }),
                        makeAdvance({
                            id: "adv-2",
                            advanceRequestId: "req-1",
                            status: "Installment Paid",
                            amount: 60,
                            repaymentDate: "2025-03-12",
                        }),
                    ]),
                }),
            }),
        });

        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                    { advanceRequestId: "req-1", status: "Installment Paid" as const },
                    { advanceRequestId: "req-1", status: "Installment Paid" as const },
                ]),
            }),
        });

        const result = await getRevertPreview("payroll-1");
        expect(result).toEqual({
            data: [
                { name: "Payroll", currentStatus: "Settled", futureStatus: "Draft" },
                {
                    name: "Timesheets (3)",
                    currentStatus: "Timesheet Paid",
                    futureStatus: "Timesheet Unpaid",
                    timesheetLines: [
                        {
                            id: "ts-1",
                            dateIn: "2025-03-01",
                            dateOut: "2025-03-01",
                            timeIn: "09:00:00",
                            timeOut: "17:00:00",
                            hours: 8,
                        },
                        {
                            id: "ts-2",
                            dateIn: "2025-03-02",
                            dateOut: "2025-03-02",
                            timeIn: "08:30:00",
                            timeOut: "16:00:00",
                            hours: 7.5,
                        },
                        {
                            id: "ts-3",
                            dateIn: "2025-03-03",
                            dateOut: "2025-03-04",
                            timeIn: "10:00:00",
                            timeOut: "19:00:00",
                            hours: 9,
                        },
                    ],
                },
                {
                    name: "Advance (2)",
                    currentStatus: "Installment Paid",
                    futureStatus: "Installment Loan",
                    advanceInstallmentLines: [
                        {
                            id: "adv-1",
                            amount: 40,
                            repaymentDate: "2025-03-10",
                        },
                        {
                            id: "adv-2",
                            amount: 60,
                            repaymentDate: "2025-03-12",
                        },
                    ],
                },
                { name: "Advance Requests (1)", currentStatus: "Advance Paid", futureStatus: "Advance Loan" },
            ],
        });
    });

    it("omits rows with 0 affected records", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([makePayroll({ status: "Settled" })]),
                }),
            }),
        });

        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        const result = await getRevertPreview("payroll-1");
        expect(result).toEqual({
            data: [
                { name: "Payroll", currentStatus: "Settled", futureStatus: "Draft" },
            ],
        });
    });
});
