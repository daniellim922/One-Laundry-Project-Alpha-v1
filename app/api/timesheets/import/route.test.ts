import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    importAttendRecordTimesheet: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/timesheet/import-attend-record-timesheet", () => ({
    importAttendRecordTimesheet: (...args: unknown[]) =>
        mocks.importAttendRecordTimesheet(...args),
}));

import { POST } from "@/app/api/timesheets/import/route";

describe("POST /api/timesheets/import", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: { user: { id: "admin-1" } },
            userId: "admin-1",
        });
    });

    it("returns structured success and revalidates timesheet + payroll pages", async () => {
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

        mocks.importAttendRecordTimesheet.mockResolvedValue({
            imported: 1,
        });

        const response = await POST(
            new Request("http://localhost/api/timesheets/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }) as never,
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                imported: 1,
            },
        });
        expect(mocks.importAttendRecordTimesheet).toHaveBeenCalledWith(payload);
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard/timesheet",
            "/dashboard/timesheet/all",
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

    it("returns 400 for invalid JSON", async () => {
        const response = await POST(
            new Request("http://localhost/api/timesheets/import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: "{",
            }) as never,
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "INVALID_JSON",
                message: "Invalid JSON",
            },
        });
        expect(mocks.importAttendRecordTimesheet).not.toHaveBeenCalled();
    });
});
