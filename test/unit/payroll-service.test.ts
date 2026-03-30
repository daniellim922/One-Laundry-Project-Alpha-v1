import { describe, expect, it, vi } from "vitest";

import { createPayrollDomainService } from "@/app/domain/payroll/service";
import type { PayrollSyncRepository } from "@/app/domain/payroll/ports";

function makeRepo(overrides: Partial<PayrollSyncRepository> = {}): PayrollSyncRepository {
    return {
        getDraftPayrollsForWorker: vi.fn().mockResolvedValue([]),
        getEmploymentForWorker: vi.fn().mockResolvedValue(null),
        getTimesheetHoursForPeriod: vi.fn().mockResolvedValue([]),
        getVoucherRestDays: vi.fn().mockResolvedValue(null),
        getLoanAdvancesForPeriod: vi.fn().mockResolvedValue([]),
        updateVoucher: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe("PayrollDomainService.synchronizeWorkerDrafts", () => {
    it("returns early when no draft payrolls exist", async () => {
        const repo = makeRepo();
        const service = createPayrollDomainService(repo);

        await service.synchronizeWorkerDrafts({ workerId: "worker-1" });

        expect(repo.getDraftPayrollsForWorker).toHaveBeenCalledWith("worker-1");
        expect(repo.getEmploymentForWorker).not.toHaveBeenCalled();
        expect(repo.updateVoucher).not.toHaveBeenCalled();
    });

    it("updates voucher when a draft payroll exists", async () => {
        const repo = makeRepo({
            getDraftPayrollsForWorker: vi.fn().mockResolvedValue([
                {
                    id: "payroll-1",
                    workerId: "worker-1",
                    payrollVoucherId: "voucher-1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                    payrollDate: "2026-02-01",
                    status: "draft",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]),
            getEmploymentForWorker: vi.fn().mockResolvedValue({
                id: "employment-1",
                employmentType: "Part Time",
                employmentArrangement: "Local Worker",
                cpf: 0,
                monthlyPay: null,
                minimumWorkingHours: null,
                hourlyRate: 10,
                restDayRate: 1.5,
                paymentMethod: null,
                payNowPhone: null,
                bankAccountNumber: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
            getTimesheetHoursForPeriod: vi.fn().mockResolvedValue([{ hours: 8 }, { hours: 7 }]),
            getVoucherRestDays: vi.fn().mockResolvedValue({ restDays: 1, publicHolidays: 0 }),
            getLoanAdvancesForPeriod: vi
                .fn()
                .mockResolvedValue([{ amount: 20, status: "loan" }]),
        });
        const service = createPayrollDomainService(repo);

        await service.synchronizeWorkerDrafts({ workerId: "worker-1" });

        expect(repo.updateVoucher).toHaveBeenCalledTimes(1);
        expect(repo.updateVoucher).toHaveBeenCalledWith(
            expect.objectContaining({
                voucherId: "voucher-1",
                totalHoursWorked: 15,
                advanceTotal: 20,
            }),
        );
    });
});
