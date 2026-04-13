import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteTimesheetEntry } from "@/app/dashboard/timesheet/delete-timesheet-entry";

describe("deleteTimesheetEntry", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("calls the timesheet delete API and returns structured success", async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                ok: true,
                data: {
                    success: true,
                },
            }),
        });

        await expect(deleteTimesheetEntry("entry-1")).resolves.toEqual({
            success: true,
        });

        expect(fetchMock).toHaveBeenCalledWith("/api/timesheets/entry-1", {
            method: "DELETE",
        });
    });

    it("maps API errors to the existing dialog error shape", async () => {
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

        await expect(deleteTimesheetEntry("entry-1")).resolves.toEqual({
            error: "Forbidden",
        });
    });
});
