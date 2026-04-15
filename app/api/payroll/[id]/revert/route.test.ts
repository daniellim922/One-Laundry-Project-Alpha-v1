import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidateTransportPaths: vi.fn(),
    revertPayroll: vi.fn(),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/revert-payroll", () => ({
    revertPayroll: (...args: unknown[]) => mocks.revertPayroll(...args),
}));

import { POST } from "@/app/api/payroll/[id]/revert/route";

describe("POST /api/payroll/[id]/revert", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns structured success and revalidates payroll side-effect pages", async () => {
        mocks.revertPayroll.mockResolvedValue({
            success: true,
            payrollId: "payroll-1",
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/payroll-1/revert", {
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
        mocks.revertPayroll.mockResolvedValue({
            success: false,
            code: "INVALID_STATE",
            error: "Only Settled payrolls can be reverted",
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/payroll-1/revert", {
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
                message: "Only Settled payrolls can be reverted",
            },
        });
        expect(mocks.revalidateTransportPaths).not.toHaveBeenCalled();
    });
});
