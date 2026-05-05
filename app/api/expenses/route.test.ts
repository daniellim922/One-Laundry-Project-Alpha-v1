import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    listExpensesWithCategories: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expenses", () => ({
    listExpensesWithCategories: (...args: unknown[]) =>
        mocks.listExpensesWithCategories(...args),
}));

import { GET } from "@/app/api/expenses/route";

const row = {
    id: "00000000-0000-4000-8000-000000000099",
    categoryName: "Overheads",
    subcategoryName: "Rent",
    supplierName: "Invoice Co",
    description: null,
    invoiceNumber: "INV-1",
    supplierGstRegNumber: null,
    subtotalCents: 10000,
    gstCents: 900,
    grandTotalCents: 10900,
    invoiceDate: "2026-05-01",
    submissionDate: "2026-05-02",
    status: "Expense Submitted" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("GET /api/expenses", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.listExpensesWithCategories.mockResolvedValue([row]);
    });

    it("lists expenses", async () => {
        const res = await GET(
            new Request("http://localhost/api/expenses"),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data).toHaveLength(1);
        expect(json.data[0].supplierName).toBe("Invoice Co");
    });

    it("passes filters when query params are valid", async () => {
        const res = await GET(
            new Request(
                `http://localhost/api/expenses?categoryName=${encodeURIComponent(row.categoryName)}&status=Expense%20Submitted`,
            ),
        );
        expect(res.status).toBe(200);
        expect(mocks.listExpensesWithCategories).toHaveBeenCalledWith({
            categoryName: row.categoryName,
            status: "Expense Submitted",
        });
    });

    it("returns 400 when query is invalid", async () => {
        const res = await GET(
            new Request("http://localhost/api/expenses?status=NotAStatus"),
        );
        expect(res.status).toBe(400);
    });
});
