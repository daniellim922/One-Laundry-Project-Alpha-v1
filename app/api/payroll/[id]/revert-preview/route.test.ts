import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    requireApiPermission: vi.fn(),
    getPayrollRevertPreview: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireApiPermission: (...args: unknown[]) =>
        mocks.requireApiPermission(...args),
}));

vi.mock("@/services/payroll/get-revert-preview", () => ({
    getPayrollRevertPreview: (...args: unknown[]) =>
        mocks.getPayrollRevertPreview(...args),
}));

import { GET } from "@/app/api/payroll/[id]/revert-preview/route";

describe("GET /api/payroll/[id]/revert-preview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.requireApiPermission.mockResolvedValue({
            session: null,
            userId: "open-access",
        });
    });

    it("returns structured preview data on success", async () => {
        mocks.getPayrollRevertPreview.mockResolvedValue({
            data: [
                {
                    name: "Payroll",
                    currentStatus: "Settled",
                    futureStatus: "Draft",
                },
            ],
        });

        const response = await GET(
            new Request("http://localhost/api/payroll/payroll-1/revert-preview"),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            data: [
                {
                    name: "Payroll",
                    currentStatus: "Settled",
                    futureStatus: "Draft",
                },
            ],
        });
        expect(mocks.getPayrollRevertPreview).toHaveBeenCalledWith("payroll-1");
    });

    it("returns structured not-found errors", async () => {
        mocks.getPayrollRevertPreview.mockResolvedValue({
            error: "Payroll not found",
            code: "NOT_FOUND",
        });

        const response = await GET(
            new Request("http://localhost/api/payroll/missing/revert-preview"),
            {
                params: Promise.resolve({ id: "missing" }),
            },
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "NOT_FOUND",
                message: "Payroll not found",
            },
        });
    });

    it("returns structured invalid-state errors", async () => {
        mocks.getPayrollRevertPreview.mockResolvedValue({
            error: "Only Settled payrolls can be previewed for revert",
            code: "INVALID_STATE",
        });

        const response = await GET(
            new Request("http://localhost/api/payroll/payroll-1/revert-preview"),
            {
                params: Promise.resolve({ id: "payroll-1" }),
            },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            error: {
                code: "INVALID_STATE",
                message: "Only Settled payrolls can be previewed for revert",
            },
        });
    });
});
