import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    listExpenseCategoriesWithSubcategories: vi.fn(),
    dbInsertReturning: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expense-master-data", () => ({
    listExpenseCategoriesWithSubcategories: (...args: unknown[]) =>
        mocks.listExpenseCategoriesWithSubcategories(...args),
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

import { GET, POST } from "@/app/api/expenses/categories/route";

describe("GET /api/expenses/categories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.listExpenseCategoriesWithSubcategories.mockResolvedValue([
            {
                id: "cat-1",
                name: "Rent",
                createdAt: new Date(),
                updatedAt: new Date(),
                subcategories: [],
            },
        ]);
    });

    it("returns nested categories", async () => {
        const res = await GET();
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            data: [
                {
                    id: "cat-1",
                    name: "Rent",
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                    subcategories: [],
                },
            ],
        });
    });
});

describe("POST /api/expenses/categories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.dbInsertReturning.mockResolvedValue([
            {
                id: "new-cat",
                name: "Utilities",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    });

    it("creates a category", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/categories", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Utilities" }),
            }),
        );
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.id).toBe("new-cat");
    });

    it("returns 400 on invalid payload", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/categories", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "" }),
            }),
        );
        expect(res.status).toBe(400);
    });
});
