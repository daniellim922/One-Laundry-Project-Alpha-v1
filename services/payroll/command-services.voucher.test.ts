import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { updateVoucherDays } from "@/services/payroll/update-voucher-days";
import { updateVoucherPayRate } from "@/services/payroll/update-voucher-pay-rates";

describe("payroll command services / voucher updates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate recalculates and persists voucher for Draft payrolls", async () => {
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
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
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
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "monthlyPay",
                value: 4000,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(mocks.db.update).toHaveBeenCalledTimes(1);
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                monthlyPay: 4000,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate updates minimum working hours and recalculates", async () => {
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
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
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
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "minimumWorkingHours",
                value: 260,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                minimumWorkingHours: 260,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });

    it("updateVoucherPayRate allows null minimum working hours and recalculates", async () => {
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
                                employmentArrangement: "Local Worker",
                                totalHoursWorked: 200,
                                minimumWorkingHours: 180,
                                monthlyPay: 3000,
                                hourlyRate: 10,
                                restDayRate: 12,
                                cpf: 5,
                                advance: 20,
                                restDays: 2,
                                publicHolidays: 1,
                                paymentMethod: "Cash",
                                payNowPhone: null,
                                bankAccountNumber: null,
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
            updateVoucherPayRate({
                payrollId: "payroll-1",
                voucherId: "voucher-1",
                field: "minimumWorkingHours",
                value: null,
            }),
        ).resolves.toEqual({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                minimumWorkingHours: null,
                subTotal: expect.any(Number),
                grandTotal: expect.any(Number),
            }),
        );
    });
});
