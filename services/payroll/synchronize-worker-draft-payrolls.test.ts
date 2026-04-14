import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
    db: {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";

describe("synchronizeWorkerDraftPayrolls", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns error when workerId is blank", async () => {
        const r = await synchronizeWorkerDraftPayrolls({ workerId: "   " });
        expect(r).toEqual({ error: "Missing workerId" });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns success when no Draft payrolls exist", async () => {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
            }),
        });

        const r = await synchronizeWorkerDraftPayrolls({ workerId: "worker-1" });
        expect(r).toEqual({ success: true });
        expect(mocks.db.select).toHaveBeenCalled();
    });

    it("sets restDays from missing timesheet dates when syncing a draft", async () => {
        const employment = {
            employmentType: "Full Time" as const,
            employmentArrangement: "Permanent" as const,
            minimumWorkingHours: 180,
            monthlyPay: 3000,
            hourlyRate: 10,
            restDayRate: 12,
            cpf: 100,
            paymentMethod: "Bank" as const,
            payNowPhone: null,
            bankAccountNumber: null,
        };

        mocks.db.select
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                        {
                            periodStart: "2026-03-01",
                            periodEnd: "2026-03-04",
                            payrollVoucherId: "voucher-1",
                            workerId: "worker-1",
                        },
                    ]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    innerJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue([{ employment }]),
                        }),
                    }),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                }),
            })
            .mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{ publicHolidays: 0 }]),
                    }),
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

        const r = await synchronizeWorkerDraftPayrolls({ workerId: "worker-1" });
        expect(r).toEqual({ success: true });
        expect(updateSet).toHaveBeenCalledWith(
            expect.objectContaining({
                restDays: 0,
            }),
        );
    });
});
