import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    dbSelectLimit: vi.fn(),
    dbUpdateWhere: vi.fn(),
    getExpenseDetailById: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/lib/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => ({
                    limit: vi.fn(() => mocks.dbSelectLimit()),
                })),
            })),
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => mocks.dbUpdateWhere()),
            })),
        })),
    },
}));

vi.mock("@/services/expense/list-expenses", () => ({
    getExpenseDetailById: (...args: unknown[]) =>
        mocks.getExpenseDetailById(...args),
}));

vi.mock("@/services/expense/revalidate-expenses", () => ({
    revalidateExpenseDashboardPaths: vi.fn(),
}));

import { PATCH } from "@/app/api/expenses/[id]/status/route";

const EXP_ID = "00000000-0000-4000-8000-000000000099";

describe("PATCH /api/expenses/[id]/status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.dbSelectLimit.mockResolvedValue([
            { id: EXP_ID, status: "Expense Submitted" },
        ]);
        mocks.dbUpdateWhere.mockResolvedValue(undefined);
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
            status: "Expense Paid",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    it("marks expense paid from submitted", async () => {
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/${EXP_ID}/status`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "Expense Paid" }),
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.status).toBe("Expense Paid");
    });

    it("returns 409 when transition is invalid (already paid, request paid)", async () => {
        mocks.dbSelectLimit.mockResolvedValue([
            { id: EXP_ID, status: "Expense Paid" },
        ]);
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/${EXP_ID}/status`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "Expense Paid" }),
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(409);
    });

    it("returns 409 when transition is invalid (submitted, request submitted)", async () => {
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/${EXP_ID}/status`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "Expense Submitted" }),
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(409);
    });

    it("reverts expense from paid to submitted", async () => {
        mocks.dbSelectLimit.mockResolvedValue([
            { id: EXP_ID, status: "Expense Paid" },
        ]);
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
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/${EXP_ID}/status`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "Expense Submitted" }),
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.status).toBe("Expense Submitted");
    });

    it("returns 400 for invalid body", async () => {
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/${EXP_ID}/status`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "Draft" }),
            }),
            { params: Promise.resolve({ id: EXP_ID }) },
        );
        expect(res.status).toBe(400);
    });
});
