import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getExpenseDetailById: vi.fn(),
    deleteExpenseByIdIfSubmitted: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expenses", () => ({
    getExpenseDetailById: (...args: unknown[]) =>
        mocks.getExpenseDetailById(...args),
}));

vi.mock("@/services/expense/delete-expense", () => ({
    deleteExpenseByIdIfSubmitted: (...args: unknown[]) =>
        mocks.deleteExpenseByIdIfSubmitted(...args),
}));

import { apiError } from "@/app/api/_shared/responses";

import { DELETE, GET } from "@/app/api/expenses/[id]/route";

const EXP_ID = "00000000-0000-4000-8000-000000000099";

describe("GET /api/expenses/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getExpenseDetailById.mockResolvedValue({
            id: EXP_ID,
            categoryName: "Overheads",
            subcategoryName: "Rent",
            supplierName: "Invoice Co",
            description: null,
            invoiceNumber: null,
            supplierGstRegNumber: null,
            subtotalCents: 100,
            gstCents: 9,
            grandTotalCents: 109,
            invoiceDate: "2026-05-01",
            submissionDate: "2026-05-02",
            status: "Expense Submitted",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    it("returns expense detail", async () => {
        const res = await GET(
            new Request(`http://localhost/api/expenses/${EXP_ID}`),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.id).toBe(EXP_ID);
    });

    it("returns 404 when missing", async () => {
        mocks.getExpenseDetailById.mockResolvedValue(null);
        const res = await GET(
            new Request("http://localhost/api/expenses/missing"),
            {
                params: Promise.resolve({
                    id: "00000000-0000-4000-8000-00000000dead",
                }),
            },
        );
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/expenses/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.deleteExpenseByIdIfSubmitted.mockResolvedValue({ ok: true });
    });

    it("deletes a submitted expense", async () => {
        const res = await DELETE(
            new Request(`http://localhost/api/expenses/${EXP_ID}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data).toEqual({ deleted: true });
        expect(mocks.deleteExpenseByIdIfSubmitted).toHaveBeenCalledWith(EXP_ID);
    });

    it("returns 404 when expense is missing", async () => {
        mocks.deleteExpenseByIdIfSubmitted.mockResolvedValue({
            ok: false,
            kind: "NOT_FOUND",
        });
        const res = await DELETE(
            new Request(`http://localhost/api/expenses/${EXP_ID}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe("NOT_FOUND");
    });

    it("returns 409 when expense is paid", async () => {
        mocks.deleteExpenseByIdIfSubmitted.mockResolvedValue({
            ok: false,
            kind: "DELETE_PAID_FORBIDDEN",
        });
        const res = await DELETE(
            new Request(`http://localhost/api/expenses/${EXP_ID}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error.code).toBe("EXPENSE_PAID_DELETE_FORBIDDEN");
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            apiError({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Authentication required",
            }),
        );

        const res = await DELETE(
            new Request(`http://localhost/api/expenses/${EXP_ID}`, {
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );

        expect(res.status).toBe(401);
        expect(mocks.deleteExpenseByIdIfSubmitted).not.toHaveBeenCalled();
    });
});
