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

import { settlePayroll } from "@/app/dashboard/payroll/actions";

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
