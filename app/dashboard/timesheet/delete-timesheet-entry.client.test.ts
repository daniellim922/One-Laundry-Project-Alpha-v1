import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteTimesheetEntry } from "@/app/dashboard/timesheet/delete-timesheet-entry";
import { mockFetchJsonResponse } from "@/test/_support/mock-fetch-json";

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
        fetchMock.mockResolvedValue(
            mockFetchJsonResponse({
                ok: true,
                data: {
                    success: true,
                },
            }),
        );

        await expect(deleteTimesheetEntry("entry-1")).resolves.toEqual({
            success: true,
        });

        expect(fetchMock).toHaveBeenCalledWith("/api/timesheets/entry-1", {
            method: "DELETE",
        });
    });

    it("maps API errors to the existing dialog error shape", async () => {
        fetchMock.mockResolvedValue(
            mockFetchJsonResponse(
                {
                    ok: false,
                    error: {
                        code: "FORBIDDEN",
                        message: "Forbidden",
                    },
                },
                false,
            ),
        );

        await expect(deleteTimesheetEntry("entry-1")).resolves.toEqual({
            error: "Forbidden",
        });
    });
});
