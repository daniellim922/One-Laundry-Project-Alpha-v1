import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getPayrollRevertPreview: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/payroll/get-revert-preview", () => ({
    getPayrollRevertPreview: (...args: unknown[]) =>
        mocks.getPayrollRevertPreview(...args),
}));

import { GET } from "@/app/api/payroll/[id]/revert-preview/route";

describe("GET /api/payroll/[id]/revert-preview", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
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

    it.each([
        {
            title: "not-found",
            id: "missing",
            mock: {
                error: "Payroll not found",
                code: "NOT_FOUND" as const,
            },
            status: 404,
            expected: {
                ok: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Payroll not found",
                },
            },
        },
        {
            title: "invalid-state",
            id: "payroll-1",
            mock: {
                error: "Only Settled payrolls can be previewed for revert",
                code: "INVALID_STATE" as const,
            },
            status: 409,
            expected: {
                ok: false,
                error: {
                    code: "INVALID_STATE",
                    message: "Only Settled payrolls can be previewed for revert",
                },
            },
        },
    ])(
        "returns structured $title errors",
        async ({ id, mock, status, expected }) => {
            mocks.getPayrollRevertPreview.mockResolvedValue(mock);

            const response = await GET(
                new Request(
                    `http://localhost/api/payroll/${id}/revert-preview`,
                ),
                {
                    params: Promise.resolve({ id }),
                },
            );

            expect(response.status).toBe(status);
            await expect(response.json()).resolves.toEqual(expected);
        },
    );
});
