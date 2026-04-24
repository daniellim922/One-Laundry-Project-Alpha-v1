import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    massUpdateWorkerMinimumWorkingHours: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: (...args: unknown[]) =>
        mocks.createClient(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/worker/mass-update-minimum-working-hours", () => ({
    massUpdateWorkerMinimumWorkingHours: (...args: unknown[]) =>
        mocks.massUpdateWorkerMinimumWorkingHours(...args),
}));

import { PATCH } from "@/app/api/workers/minimum-working-hours/route";

const WORKER_1 = "20000000-0000-4000-8000-000000000001";

describe("PATCH /api/workers/minimum-working-hours", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: "operator@example.com",
                        },
                    },
                    error: null,
                }),
            },
        });
    });

    it("returns structured success and revalidates worker + payroll pages", async () => {
        mocks.massUpdateWorkerMinimumWorkingHours.mockResolvedValue({
            updatedCount: 1,
            failed: [],
        });

        const response = await PATCH(
            new Request("http://localhost/api/workers/minimum-working-hours", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    updates: [
                        {
                            workerId: WORKER_1,
                            minimumWorkingHours: 260,
                        },
                    ],
                }),
            }) as never,
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                updatedCount: 1,
                failed: [],
            },
        });
        expect(mocks.massUpdateWorkerMinimumWorkingHours).toHaveBeenCalledWith({
            updates: [{ workerId: WORKER_1, minimumWorkingHours: 260 }],
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard",
            "/dashboard/worker",
            "/dashboard/worker/all",
            "/dashboard/payroll",
            "/dashboard/payroll/all",
            {
                path: "/dashboard/payroll/[id]/summary",
                type: "page",
            },
            {
                path: "/dashboard/payroll/[id]/breakdown",
                type: "page",
            },
        ]);
    });

    it("returns 401 when there is no authenticated session", async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: { user: null },
                    error: null,
                }),
            },
        });

        const response = await PATCH(
            new Request("http://localhost/api/workers/minimum-working-hours", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    updates: [
                        {
                            workerId: WORKER_1,
                            minimumWorkingHours: 260,
                        },
                    ],
                }),
            }) as never,
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        expect(mocks.massUpdateWorkerMinimumWorkingHours).not.toHaveBeenCalled();
    });

    it("returns 401 when the authenticated user has no email", async () => {
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({
                    data: {
                        user: {
                            email: null,
                        },
                    },
                    error: null,
                }),
            },
        });

        const response = await PATCH(
            new Request("http://localhost/api/workers/minimum-working-hours", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    updates: [
                        {
                            workerId: WORKER_1,
                            minimumWorkingHours: 260,
                        },
                    ],
                }),
            }) as never,
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        expect(mocks.massUpdateWorkerMinimumWorkingHours).not.toHaveBeenCalled();
    });
});
