import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    updateVoucherDays: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/update-voucher-days", () => ({
    updateVoucherDays: (...args: unknown[]) => mocks.updateVoucherDays(...args),
}));

import { PATCH } from "@/app/api/payroll/[id]/voucher-days/route";

describe("PATCH /api/payroll/[id]/voucher-days", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: { user: { id: "admin-1" } },
            userId: "admin-1",
        });
    });

    it("returns structured success and revalidates payroll pages", async () => {
        mocks.updateVoucherDays.mockResolvedValue({
            success: true,
            payrollId: "payroll-1",
            voucherId: "voucher-1",
        });

        const response = await PATCH(
            new Request("http://localhost/api/payroll/payroll-1/voucher-days", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    voucherId: "voucher-1",
                    restDays: 4,
                    publicHolidays: 1,
                }),
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
                voucherId: "voucher-1",
            },
        });
        expect(mocks.updateVoucherDays).toHaveBeenCalledWith({
            payrollId: "payroll-1",
            voucherId: "voucher-1",
            restDays: 4,
            publicHolidays: 1,
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            "/dashboard/payroll/payroll-1/breakdown",
            "/dashboard/payroll/payroll-1/summary",
            "/dashboard/payroll",
            "/dashboard/payroll/all",
        ]);
    });

    it("maps voucher conflicts to 409", async () => {
        mocks.updateVoucherDays.mockResolvedValue({
            success: false,
            code: "CONFLICT",
            error: "Only Draft payrolls can edit voucher days",
        });

        const response = await PATCH(
            new Request("http://localhost/api/payroll/payroll-1/voucher-days", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    voucherId: "voucher-1",
                    restDays: 4,
                    publicHolidays: 1,
                }),
            }),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "CONFLICT",
                message: "Only Draft payrolls can edit voucher days",
            },
        });
        expect(mocks.revalidateTransportPaths).not.toHaveBeenCalled();
    });
});
