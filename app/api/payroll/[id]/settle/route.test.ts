import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    settlePayroll: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/settle-payroll", () => ({
    settlePayroll: (...args: unknown[]) => mocks.settlePayroll(...args),
}));

import { POST } from "@/app/api/payroll/[id]/settle/route";

describe("POST /api/payroll/[id]/settle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: { user: { id: "admin-1" } },
            userId: "admin-1",
        });
    });

    it("returns structured success and revalidates payroll side-effect pages", async () => {
        mocks.settlePayroll.mockResolvedValue({
            success: true,
            payrollId: "payroll-1",
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/payroll-1/settle", {
                method: "POST",
            }),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
                payrollId: "payroll-1",
            },
        });
        expect(mocks.settlePayroll).toHaveBeenCalledWith({
            payrollId: "payroll-1",
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard/payroll/payroll-1/breakdown",
            "/dashboard/payroll/payroll-1/summary",
            "/dashboard/payroll",
            "/dashboard/payroll/all",
            "/dashboard/advance",
            "/dashboard/advance/all",
            "/dashboard/timesheet",
            "/dashboard/timesheet/all",
        ]);
    });

    it("maps invalid payroll transitions to 409", async () => {
        mocks.settlePayroll.mockResolvedValue({
            success: false,
            code: "INVALID_STATE",
            error: "Only Draft payrolls can be settled",
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/payroll-1/settle", {
                method: "POST",
            }),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "INVALID_STATE",
                message: "Only Draft payrolls can be settled",
            },
        });
        expect(mocks.revalidateTransportPaths).not.toHaveBeenCalled();
    });
});
