import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    settleDraftPayrolls: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
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

const PAYROLL_A = "10000000-0000-4000-8000-000000000001";
const PAYROLL_B = "10000000-0000-4000-8000-000000000002";

describe("POST /api/payroll/settle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
    });

    it("returns structured success and revalidates all affected pages", async () => {
        mocks.settleDraftPayrolls.mockResolvedValue({
            success: true,
            settled: 2,
            settledPayrollIds: [PAYROLL_A, PAYROLL_B],
        });

        const response = await POST(
            new Request("http://localhost/api/payroll/settle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    payrollIds: [PAYROLL_B, PAYROLL_A],
                }),
            }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
                settled: 2,
                settledPayrollIds: [PAYROLL_A, PAYROLL_B],
            },
        });
        expect(mocks.settleDraftPayrolls).toHaveBeenCalledWith({
            payrollIds: [PAYROLL_B, PAYROLL_A],
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            `/dashboard/payroll/${PAYROLL_A}/breakdown`,
            `/dashboard/payroll/${PAYROLL_A}/summary`,
            `/dashboard/payroll/${PAYROLL_B}/breakdown`,
            `/dashboard/payroll/${PAYROLL_B}/summary`,
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
