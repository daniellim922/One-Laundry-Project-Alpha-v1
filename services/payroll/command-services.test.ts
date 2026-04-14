import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdvance, makePayroll } from "@/test/fixtures/payroll-fixtures";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { settlePayroll } from "@/services/payroll/settle-payroll";
import { revertPayroll } from "@/services/payroll/revert-payroll";
import { settleDraftPayrolls } from "@/services/payroll/settle-draft-payrolls";
import { updateVoucherDays } from "@/services/payroll/update-voucher-days";

describe("payroll command services", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("settlePayroll returns not found when payroll is missing", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        });

        await expect(settlePayroll({ payrollId: "missing" })).resolves.toEqual({
            success: false,
            code: "NOT_FOUND",
            error: "Payroll not found",
        });
    });

    it("settlePayroll settles payroll and updates related records in one transaction", async () => {
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
        const txSelect = vi
            .fn()
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([
                            makeAdvance({
                                id: "adv-1",
                                advanceRequestId: "req-1",
                                status: "Installment Loan",
                            }),
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            advanceRequestId: "req-1",
                            status: "Installment Paid" as const,
                        },
                    ]),
                }),
            });

        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    update: txUpdate,
                    select: txSelect,
                }),
        );

        await expect(settlePayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
        });
        expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
        expect(txUpdate).toHaveBeenCalled();
    });

    it("revertPayroll rejects Draft payrolls", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                        makePayroll({ status: "Draft" }),
                    ]),
                }),
            }),
        });

        await expect(revertPayroll({ payrollId: "payroll-1" })).resolves.toEqual({
            success: false,
            code: "INVALID_STATE",
            error: "Only Settled payrolls can be reverted",
        });
    });

    it("settleDraftPayrolls validates the full selection before applying batch side effects", async () => {
        mocks.db.transaction.mockImplementationOnce(
            async (callback: (tx: unknown) => Promise<void>) =>
                callback({
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([
                                makePayroll({ id: "payroll-1" }),
                                makePayroll({
                                    id: "payroll-2",
                                    status: "Settled",
                                }),
                            ]),
                        }),
                    }),
                }),
        );

        await expect(
            settleDraftPayrolls({
                payrollIds: ["payroll-1", "payroll-2"],
            }),
        ).resolves.toEqual({
            success: false,
            code: "INVALID_STATE",
            error: "One or more payrolls are not drafts",
        });
    });

    it("updateVoucherDays recalculates and persists voucher totals for Draft payrolls", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                status: "Draft",
                                payrollVoucherId: "voucher-1",
                            },
                        ]),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            {
                                employmentType: "Full Time",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 0,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                            },
                        ]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            updateVoucherDays({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                restDays: 4,
                publicHolidays: 1,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(mocks.db.update).toHaveBeenCalledTimes(1);
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                restDays: 4,
                publicHolidays: 1,
                totalPay: expect.any(Number),
                netPay: expect.any(Number),
            }),
        );
    });
});
