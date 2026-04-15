import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    listPayrollsForDownload: vi.fn(),
}));

vi.mock("@/services/payroll/list-payrolls-for-download", () => ({
    listPayrollsForDownload: (...args: unknown[]) =>
        mocks.listPayrollsForDownload(...args),
}));

import { GET } from "@/app/api/payroll/download-selection/route";

describe("GET /api/payroll/download-selection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns download selection rows", async () => {
        mocks.listPayrollsForDownload.mockResolvedValue([
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
                },
            ],
        });
    });

    it("returns an empty state without error", async () => {
        mocks.listPayrollsForDownload.mockResolvedValue([]);

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: [],
        });
    });
});
