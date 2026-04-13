import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateWorkerMinimumWorkingHours } from "@/app/dashboard/worker/mass-edit/update-worker-minimum-working-hours";

describe("updateWorkerMinimumWorkingHours", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("calls the worker minimum-hours API and returns structured data", async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                ok: true,
                data: {
                    updatedCount: 1,
                    failed: [],
                },
            }),
        });

        await expect(
            updateWorkerMinimumWorkingHours({
                updates: [{ workerId: "worker-1", minimumWorkingHours: 260 }],
            }),
        ).resolves.toEqual({
            updatedCount: 1,
            failed: [],
        });

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/workers/minimum-working-hours",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    updates: [{ workerId: "worker-1", minimumWorkingHours: 260 }],
                }),
            },
        );
    });

    it("maps API errors to the existing dialog fallback message", async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            json: vi.fn().mockResolvedValue({
                ok: false,
                error: {
                    code: "FORBIDDEN",
                    message: "Forbidden",
                },
            }),
        });

        await expect(
            updateWorkerMinimumWorkingHours({
                updates: [{ workerId: "worker-1", minimumWorkingHours: 260 }],
            }),
        ).resolves.toEqual({
            error: "Forbidden",
        });
    });
});
