import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getExpenseCategoryById: vi.fn(),
    dbInsertReturning: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expense-master-data", () => ({
    getExpenseCategoryById: (...args: unknown[]) =>
        mocks.getExpenseCategoryById(...args),
}));

vi.mock("@/lib/db", () => ({
    db: {
        insert: vi.fn(() => ({
            values: vi.fn(() => ({
                returning: (...args: unknown[]) =>
                    mocks.dbInsertReturning(...args),
            })),
        })),
    },
}));

vi.mock("@/services/expense/revalidate-expenses", () => ({
    revalidateExpenseDashboardPaths: vi.fn(),
}));

import { POST } from "@/app/api/expenses/subcategories/route";

describe("POST /api/expenses/subcategories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        const catId = "00000000-0000-4000-8000-000000000001";
        mocks.getExpenseCategoryById.mockResolvedValue({
            id: catId,
            type: "Fixed",
            name: "Rent",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mocks.dbInsertReturning.mockResolvedValue([
            {
                id: "00000000-0000-4000-8000-0000000000aa",
                categoryId: catId,
                name: "Office rent",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    });

    it("creates a subcategory", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/subcategories", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    categoryId: "00000000-0000-4000-8000-000000000001",
                    name: "Office rent",
                }),
            }),
        );
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.name).toBe("Office rent");
    });

    it("returns 400 when parent category missing", async () => {
        mocks.getExpenseCategoryById.mockResolvedValue(null);
        const res = await POST(
            new Request("http://localhost/api/expenses/subcategories", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    categoryId: "missing",
                    name: "X",
                }),
            }),
        );
        expect(res.status).toBe(400);
    });
});
