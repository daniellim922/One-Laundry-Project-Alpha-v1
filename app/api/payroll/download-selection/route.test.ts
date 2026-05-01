import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    listPayrollsForDownload: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) =>
        mocks.createClient(...args),
}));

vi.mock("@/services/payroll/list-payrolls-for-download", () => ({
    listPayrollsForDownload: (...args: unknown[]) =>
        mocks.listPayrollsForDownload(...args),
}));

import { GET } from "@/app/api/payroll/download-selection/route";

import {
    resolvedSupabaseNoSessionUser,
    resolvedSupabaseSignedInMissingEmail,
    resolvedSupabaseSignedInUser,
    ROUTE_TEST_OPERATOR_EMAIL,
    unauthorizedRouteJsonEnvelope,
} from "@/test/_support/supabase-server-route-mock";

describe("GET /api/payroll/download-selection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createClient.mockResolvedValue(
            resolvedSupabaseSignedInUser(ROUTE_TEST_OPERATOR_EMAIL),
        );
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
                voucherNumber: "2026-1001",
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
                    voucherNumber: "2026-1001",
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

    it("returns 401 when there is no authenticated session", async () => {
        mocks.createClient.mockResolvedValue(resolvedSupabaseNoSessionUser());

        const response = await GET();

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual(
            unauthorizedRouteJsonEnvelope(),
        );
        expect(mocks.listPayrollsForDownload).not.toHaveBeenCalled();
    });

    it("returns 401 when the authenticated user has no email", async () => {
        mocks.createClient.mockResolvedValue(resolvedSupabaseSignedInMissingEmail());

        const response = await GET();

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual(
            unauthorizedRouteJsonEnvelope(),
        );
        expect(mocks.listPayrollsForDownload).not.toHaveBeenCalled();
    });
});
