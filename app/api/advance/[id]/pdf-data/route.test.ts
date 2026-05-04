import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiError } from "@/app/api/_shared/responses";
import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getAdvanceRequestByIdWithWorker: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/utils/advance/queries", () => ({
    getAdvanceRequestByIdWithWorker: (...args: unknown[]) =>
        mocks.getAdvanceRequestByIdWithWorker(...args),
}));

import { GET } from "@/app/api/advance/[id]/pdf-data/route";

describe("GET /api/advance/[id]/pdf-data", () => {
    const detail = {
        request: {
            workerName: "Jamie Tan",
            amountRequested: 700,
            status: "Advance Loan" as const,
            requestDate: "2026-04-20",
        },
        advances: [
            {
                id: "line-1",
                amount: 233.33,
                status: "Installment Loan" as const,
                repaymentDate: "2026-05-31",
            },
        ],
        employeeSignature: null,
        employeeSignatureDate: null,
        managerSignature: null,
        managerSignatureDate: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getAdvanceRequestByIdWithWorker.mockResolvedValue(detail);
    });

    it("maps advance detail into AdvanceVoucherData", async () => {
        const res = await GET(
            new Request("http://localhost/api/advance/adv-1/pdf-data"),
            { params: Promise.resolve({ id: "adv-1" }) },
        );

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            data: {
                request: detail.request,
                advances: [
                    {
                        id: "line-1",
                        amount: 233.33,
                        status: "Installment Loan",
                        repaymentDate: "2026-05-31",
                    },
                ],
                employeeSignature: null,
                employeeSignatureDate: null,
                managerSignature: null,
                managerSignatureDate: null,
            },
        });
        expect(mocks.getAdvanceRequestByIdWithWorker).toHaveBeenCalledWith(
            "adv-1",
        );
    });

    it("returns NOT_FOUND when advance is missing", async () => {
        mocks.getAdvanceRequestByIdWithWorker.mockResolvedValue(null);

        const res = await GET(
            new Request("http://localhost/api/advance/nope/pdf-data"),
            { params: Promise.resolve({ id: "nope" }) },
        );

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            apiError({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Authentication required",
            }),
        );

        const res = await GET(
            new Request("http://localhost/api/advance/adv-1/pdf-data"),
            { params: Promise.resolve({ id: "adv-1" }) },
        );

        expect(res.status).toBe(401);
        expect(mocks.getAdvanceRequestByIdWithWorker).not.toHaveBeenCalled();
    });
});
