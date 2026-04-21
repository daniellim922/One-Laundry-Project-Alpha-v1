import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    listDraftPayrollsForSettlement: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/payroll/list-draft-payrolls-for-settlement", () => ({
    listDraftPayrollsForSettlement: (...args: unknown[]) =>
        mocks.listDraftPayrollsForSettlement(...args),
}));

import { GET } from "@/app/api/payroll/settlement-candidates/route";

describe("GET /api/payroll/settlement-candidates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireCurrentApiUser.mockResolvedValue({
            email: "operator@example.com",
        });
    });

    it("returns settlement candidates", async () => {
        mocks.listDraftPayrollsForSettlement.mockResolvedValue([
            {
                id: "payroll-1",
                workerId: "worker-1",
                payrollVoucherId: "voucher-1",
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-05",
                status: "Draft",
                createdAt: "2026-01-31T00:00:00.000Z",
                updatedAt: "2026-01-31T00:00:00.000Z",
                workerName: "Alice",
                employmentType: "Monthly",
                employmentArrangement: "Full-time",
                voucherNumber: 1001,
            },
        ]);

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: [
                {
                    id: "payroll-1",
                    workerId: "worker-1",
                    payrollVoucherId: "voucher-1",
                    periodStart: "2026-01-01",
                    periodEnd: "2026-01-31",
                    payrollDate: "2026-02-05",
                    status: "Draft",
                    createdAt: "2026-01-31T00:00:00.000Z",
                    updatedAt: "2026-01-31T00:00:00.000Z",
                    workerName: "Alice",
                    employmentType: "Monthly",
                    employmentArrangement: "Full-time",
                    voucherNumber: 1001,
                },
            ],
        });
    });

    it("returns an empty state without error", async () => {
        mocks.listDraftPayrollsForSettlement.mockResolvedValue([]);

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: [],
        });
    });
});
