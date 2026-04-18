import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    createSupabaseServerClient: vi.fn(),
    listPayrollsForDownload: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: (...args: unknown[]) =>
        mocks.createSupabaseServerClient(...args),
}));

vi.mock("@/services/payroll/list-payrolls-for-download", () => ({
    listPayrollsForDownload: (...args: unknown[]) =>
        mocks.listPayrollsForDownload(...args),
}));

import { GET } from "@/app/api/payroll/download-selection/route";

describe("GET /api/payroll/download-selection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "admin@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
        process.env.AUTH_ADMIN_EMAIL = "admin@example.com";
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

    it("returns 401 when there is no authenticated session", async () => {
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: null,
                }),
            },
        });

        const response = await GET();

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        expect(mocks.listPayrollsForDownload).not.toHaveBeenCalled();
    });

    it("returns 401 when the authenticated user is not the configured admin", async () => {
        mocks.createSupabaseServerClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "worker@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });

        const response = await GET();

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        expect(mocks.listPayrollsForDownload).not.toHaveBeenCalled();
    });
});
