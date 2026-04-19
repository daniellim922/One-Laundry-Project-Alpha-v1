import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import {
    refreshAffectedDraftPayrollsForPublicHolidayYear,
} from "@/services/payroll/refresh-affected-draft-payrolls-for-public-holiday-year";

describe("refresh affected draft payrolls for public holiday year", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("recomputes overlapping Draft payroll vouchers and returns the affected payroll ids", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            id: "payroll-draft-1",
                            workerId: "worker-1",
                            payrollVoucherId: "voucher-1",
                            periodStart: "2025-12-31",
                            periodEnd: "2026-01-02",
                        },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([
                                {
                                    employment: {
                                        employmentType: "Full Time",
                                        employmentArrangement: "Local Worker",
                                        minimumWorkingHours: 8,
                                        monthlyPay: 1000,
                                        hourlyRate: 10,
                                        restDayRate: 25,
                                        cpf: 50,
                                        paymentMethod: "Cash",
                                        payNowPhone: null,
                                        bankAccountNumber: null,
                                    },
                                },
                            ]),
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        { hours: "8", dateIn: "2025-12-31" },
                        { hours: "8", dateIn: "2026-01-01" },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        { date: "2025-12-31" },
                        { date: "2026-01-01" },
                        { date: "2026-01-02" },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

        const updateWhere = vi.fn().mockResolvedValue(undefined);
        const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
        mocks.db.update.mockReturnValue({
            set: updateSet,
        });

        await expect(
            refreshAffectedDraftPayrollsForPublicHolidayYear({ year: 2026 }),
        ).resolves.toEqual({
            success: true,
            affectedPayrollIds: ["payroll-draft-1"],
        });

        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                publicHolidays: 2,
                publicHolidayPay: 50,
                totalPay: 1205,
                netPay: 1155,
            }),
        );
        expect(updateWhere).toHaveBeenCalledTimes(1);
    });

    it("leaves non-overlapping or already-settled payrolls untouched by updating only overlapping Draft vouchers", async () => {
        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            });

        await expect(
            refreshAffectedDraftPayrollsForPublicHolidayYear({ year: 2026 }),
        ).resolves.toEqual({
            success: true,
            affectedPayrollIds: [],
        });

        expect(mocks.db.update).not.toHaveBeenCalled();
    });
});
