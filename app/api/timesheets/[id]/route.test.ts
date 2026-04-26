import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    deleteTimesheetEntry: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/timesheet/delete-timesheet-entry", () => ({
    deleteTimesheetEntry: (...args: unknown[]) =>
        mocks.deleteTimesheetEntry(...args),
}));

import { DELETE } from "@/app/api/timesheets/[id]/route";

describe("DELETE /api/timesheets/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
    });

    it("returns structured success and revalidates timesheet + payroll pages", async () => {
        mocks.deleteTimesheetEntry.mockResolvedValue({
            success: true,
        });

        const response = await DELETE(
            new Request("http://localhost/api/timesheets/entry-1", {
                method: "DELETE",
            }) as never,
            {
                params: Promise.resolve({ id: "entry-1" }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
            },
        });
        expect(mocks.deleteTimesheetEntry).toHaveBeenCalledWith({
            id: "entry-1",
        });
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
});
