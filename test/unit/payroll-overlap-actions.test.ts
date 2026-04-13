import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    findPayrollPeriodConflicts: vi.fn(),
    db: {
        select: vi.fn(),
        transaction: vi.fn(),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/utils/payroll/payroll-period-conflicts", async () => {
    const actual =
        await vi.importActual<
            typeof import("@/utils/payroll/payroll-period-conflicts")
        >("@/utils/payroll/payroll-period-conflicts");
    return {
        ...actual,
        findPayrollPeriodConflicts: (...args: unknown[]) =>
            mocks.findPayrollPeriodConflicts(...args),
    };
});

import {
    createPayrollRecords,
    updatePayrollRecord,
} from "@/services/payroll/save-payroll";

function mockSelectWithLimitResolved(value: unknown) {
    const limit = vi.fn().mockResolvedValue(value);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mocks.db.select.mockReturnValueOnce({ from });
}

function mockSelectWithJoinLimitResolved(value: unknown) {
    const limit = vi.fn().mockResolvedValue(value);
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    mocks.db.select.mockReturnValueOnce({ from });
}

describe("payroll overlap action handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns validation error when period range is reversed", async () => {
        const fd = new FormData();
        fd.append("workerId", "worker-1");
        fd.set("periodStart", "2026-03-31");
        fd.set("periodEnd", "2026-03-01");
        fd.set("payrollDate", "2026-04-05");

        const result = await createPayrollRecords({
            workerIds: fd.getAll("workerId") as string[],
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            error: "Period end must be on or after period start",
        });
        expect(mocks.db.select).not.toHaveBeenCalled();
    });

    it("returns partial-success payload for batch overlap conflicts", async () => {
        const conflict = {
            payrollId: "payroll-existing-1",
            workerId: "worker-1",
            workerName: "Alicia",
            periodStart: "2026-03-01",
            periodEnd: "2026-03-31",
            status: "Draft" as const,
        };

        mockSelectWithJoinLimitResolved([
            {
                worker: { id: "worker-1" },
                employment: {},
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([conflict]);

        const fd = new FormData();
        fd.append("workerId", "worker-1");
        fd.set("periodStart", "2026-03-01");
        fd.set("periodEnd", "2026-03-31");
        fd.set("payrollDate", "2026-04-05");

        const result = await createPayrollRecords({
            workerIds: fd.getAll("workerId") as string[],
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            success: true,
            created: 0,
            skipped: 1,
            conflicts: [conflict],
        });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
    });

    it("returns structured overlap conflict on payroll edit", async () => {
        const conflict = {
            payrollId: "payroll-existing-2",
            workerId: "worker-1",
            workerName: "Alicia",
            periodStart: "2026-03-15",
            periodEnd: "2026-04-10",
            status: "Settled" as const,
        };

        mockSelectWithLimitResolved([
            {
                id: "payroll-editing",
                workerId: "worker-1",
                payrollVoucherId: "voucher-1",
                status: "Draft",
            },
        ]);
        mockSelectWithJoinLimitResolved([
            {
                worker: { id: "worker-1" },
                employment: {},
            },
        ]);
        mocks.findPayrollPeriodConflicts.mockResolvedValueOnce([conflict]);

        const fd = new FormData();
        fd.set("periodStart", "2026-03-20");
        fd.set("periodEnd", "2026-04-20");
        fd.set("payrollDate", "2026-04-25");

        const result = await updatePayrollRecord({
            payrollId: "payroll-editing",
            periodStart: fd.get("periodStart") as string,
            periodEnd: fd.get("periodEnd") as string,
            payrollDate: fd.get("payrollDate") as string,
        });

        expect(result).toEqual({
            error: "Payroll period overlaps with existing payroll for Alicia (2026-03-15 to 2026-04-10)",
            code: "OVERLAP_CONFLICT",
            conflicts: [conflict],
        });
        expect(mocks.db.transaction).not.toHaveBeenCalled();
    });
});
