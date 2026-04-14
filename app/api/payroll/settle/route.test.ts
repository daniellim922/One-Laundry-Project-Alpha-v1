import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    settleDraftPayrolls: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/settle-draft-payrolls", () => ({
    settleDraftPayrolls: (...args: unknown[]) =>
        mocks.settleDraftPayrolls(...args),
}));

import { POST } from "@/app/api/payroll/settle/route";

describe("POST /api/payroll/settle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: { user: { id: "admin-1" } },
            userId: "admin-1",
        });
    });

    it("returns structured success and revalidates all affected pages", async () => {
        mocks.settleDraftPayrolls.mockResolvedValue({
            success: true,
            settled: 2,
            settledPayrollIds: ["payroll-1", "payroll-2"],
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/settle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payrollIds: ["payroll-2", "payroll-1"],
                }),
            }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
                settled: 2,
                settledPayrollIds: ["payroll-1", "payroll-2"],
            },
        });
        expect(mocks.settleDraftPayrolls).toHaveBeenCalledWith({
            payrollIds: ["payroll-2", "payroll-1"],
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard/payroll/payroll-1/breakdown",
            "/dashboard/payroll/payroll-1/summary",
            "/dashboard/payroll/payroll-2/breakdown",
            "/dashboard/payroll/payroll-2/summary",
            "/dashboard/payroll",
            "/dashboard/payroll/all",
            "/dashboard/advance",
            "/dashboard/advance/all",
            "/dashboard/timesheet",
            "/dashboard/timesheet/all",
        ]);
    });

    it("maps invalid request bodies to 400", async () => {
        const response = await POST(
            new Request("http://localhost/api/payroll/settle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payrollIds: "payroll-1",
                }),
            }),
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: expect.objectContaining({
                code: "VALIDATION_ERROR",
                message: "Invalid payroll settlement request.",
            }),
        });
        expect(mocks.settleDraftPayrolls).not.toHaveBeenCalled();
    });
});
