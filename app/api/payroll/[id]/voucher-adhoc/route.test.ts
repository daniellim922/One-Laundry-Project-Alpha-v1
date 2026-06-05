import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    revalidateTransportPaths: vi.fn(),
    updateVoucherAdhoc: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/app/api/_shared/revalidate", () => ({
    revalidateTransportPaths: (...args: unknown[]) =>
        mocks.revalidateTransportPaths(...args),
}));

vi.mock("@/services/payroll/update-voucher-adhoc", () => ({
    updateVoucherAdhoc: (...args: unknown[]) =>
        mocks.updateVoucherAdhoc(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/pdf/regenerate-payroll-pdf", () => ({
    regeneratePayrollPdf: vi.fn().mockResolvedValue(undefined),
}));

import { PATCH } from "@/app/api/payroll/[id]/voucher-adhoc/route";

const PAYROLL_1 = "30000000-0000-4000-8000-000000000001";
const VOUCHER_1 = "30000000-0000-4000-8000-000000000002";

describe("PATCH /api/payroll/[id]/voucher-adhoc", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
    });

    it("returns structured success and revalidates payroll pages", async () => {
        mocks.updateVoucherAdhoc.mockResolvedValue({
            success: true,
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
        });

        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-adhoc`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        adhoc: [{ name: "Bonus", amount: 50 }],
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
        expect(mocks.updateVoucherAdhoc).toHaveBeenCalledWith({
            payrollId: PAYROLL_1,
            voucherId: VOUCHER_1,
            adhoc: [{ name: "Bonus", amount: 50 }],
        });
        expect(mocks.revalidateTransportPaths).toHaveBeenCalled();
    });

    it("rejects invalid adhoc payloads", async () => {
        const response = await PATCH(
            new Request(
                `http://localhost/api/payroll/${PAYROLL_1}/voucher-adhoc`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        voucherId: VOUCHER_1,
                        adhoc: [{ name: "", amount: 0 }],
                    }),
                },
            ),
            {
                params: Promise.resolve({ id: PAYROLL_1 }),
            },
        );

        expect(response.status).toBe(400);
        expect(mocks.updateVoucherAdhoc).not.toHaveBeenCalled();
    });
});
