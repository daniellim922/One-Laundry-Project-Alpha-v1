import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidateTransportPaths: vi.fn(),
    massUpdateWorkerMinimumWorkingHours: vi.fn(),
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

describe("PATCH /api/workers/minimum-working-hours", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
                            workerId: "worker-1",
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
            updates: [{ workerId: "worker-1", minimumWorkingHours: 260 }],
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
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
});
