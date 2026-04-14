import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importAttendRecordTimesheet } from "@/app/dashboard/timesheet/import/import-attend-record-timesheet";

describe("importAttendRecordTimesheet", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it("calls the timesheet import API and returns the import result", async () => {
        const payload = {
            attendanceDate: {
                startDate: "01/01/2026",
                endDate: "28/01/2026",
            },
            tablingDate: "28/01/2026 17:10:10",
            workers: [
                {
                    userId: "",
                    name: "Worker One",
                    dates: [
                        {
                            dateIn: "01/01/2026",
                            timeIn: "09:00",
                            dateOut: "01/01/2026",
                            timeOut: "17:00",
                            hours: 8,
                        },
                    ],
                },
            ],
        };

        fetchMock.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                ok: true,
                data: {
                    imported: 1,
                },
            }),
        });

        await expect(importAttendRecordTimesheet(payload)).resolves.toEqual({
            imported: 1,
        });

        expect(fetchMock).toHaveBeenCalledWith("/api/timesheets/import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    });

    it("maps API failures to the existing import error fallback", async () => {
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
            importAttendRecordTimesheet({
                attendanceDate: {
                    startDate: "01/01/2026",
                    endDate: "28/01/2026",
                },
                tablingDate: "28/01/2026 17:10:10",
                workers: [],
            }),
        ).resolves.toEqual({
            error: "Forbidden",
        });
    });
});
