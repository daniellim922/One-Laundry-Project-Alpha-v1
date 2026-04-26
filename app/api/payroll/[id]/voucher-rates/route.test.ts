import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    updateVoucherPayRate: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/update-voucher-pay-rates", () => ({
    updateVoucherPayRate: (...args: unknown[]) =>
        mocks.updateVoucherPayRate(...args),
}));

import { PATCH } from "@/app/api/payroll/[id]/voucher-rates/route";

const PAYROLL_1 = "30000000-0000-4000-8000-000000000001";
const VOUCHER_1 = "30000000-0000-4000-8000-000000000002";

describe("PATCH /api/payroll/[id]/voucher-rates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
    });

    it("returns structured success and revalidates payroll pages", async () => {
        mocks.updateVoucherPayRate.mockResolvedValue({
            success: true,
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
        });

        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-rates`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        field: "monthlyPay",
                        value: 4000,
                    }),
                },
            ),
            {
                params: Promise.resolve({ id: PAYROLL_1 }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
                payrollId: PAYROLL_1,
                voucherId: VOUCHER_1,
            },
        });
        expect(mocks.updateVoucherPayRate).toHaveBeenCalledWith({
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
            field: "monthlyPay",
            value: 4000,
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalledWith([
            `/dashboard/payroll/${PAYROLL_1}/breakdown`,
            `/dashboard/payroll/${PAYROLL_1}/summary`,
            "/dashboard/payroll",
            "/dashboard/payroll/all",
        ]);
    });

    it("allows null value for minimumWorkingHours", async () => {
        mocks.updateVoucherPayRate.mockResolvedValue({
            success: true,
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
        });

        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-rates`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        field: "minimumWorkingHours",
                        value: null,
                    }),
                },
            ),
            {
                params: Promise.resolve({ id: PAYROLL_1 }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: {
                success: true,
                payrollId: PAYROLL_1,
                voucherId: VOUCHER_1,
            },
        });
        expect(mocks.updateVoucherPayRate).toHaveBeenCalledWith({
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
            field: "minimumWorkingHours",
            value: null,
        });
    });

    it("rejects null value for non-minimumWorkingHours fields", async () => {
        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-rates`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        field: "hourlyRate",
                        value: null,
                    }),
                },
            ),
            {
                params: Promise.resolve({ id: PAYROLL_1 }),
            },
        );

        expect(response.status).toBe(400);
        expect(mocks.updateVoucherPayRate).not.toHaveBeenCalled();
    });

    it("maps voucher conflicts to 409", async () => {
        mocks.updateVoucherPayRate.mockResolvedValue({
            success: false,
            code: "CONFLICT",
            error: "Only Draft payrolls can edit voucher pay rates",
        });

        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-rates`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        field: "hourlyRate",
                        value: 8,
                    }),
                },
            ),
            {
                params: Promise.resolve({ id: PAYROLL_1 }),
            },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "CONFLICT",
                message: "Only Draft payrolls can edit voucher pay rates",
            },
        });
        expect(mocks.revalidateTransportPaths).not.toHaveBeenCalled();
    });
});
