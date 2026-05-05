import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getExpenseCategoryById: vi.fn(),
    dbUpdateReturning: vi.fn(),
    dbDeleteWhere: vi.fn(),
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
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => ({
                    returning: (...args: unknown[]) =>
                        mocks.dbUpdateReturning(...args),
                })),
            })),
        })),
        delete: vi.fn(() => ({
            where: vi.fn(() => mocks.dbDeleteWhere()),
        })),
    },
}));

vi.mock("@/services/expense/revalidate-expenses", () => ({
    revalidateExpenseDashboardPaths: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/expenses/categories/[id]/route";

describe("PATCH /api/expenses/categories/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getExpenseCategoryById.mockResolvedValue({
            id: "cat-1",
            name: "Old",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mocks.dbUpdateReturning.mockResolvedValue([
            {
                id: "cat-1",
                name: "Updated",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    });

    it("updates a category", async () => {
        const res = await PATCH(
            new Request("http://localhost/api/expenses/categories/cat-1", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Updated" }),
            }),
            { params: Promise.resolve({ id: "cat-1" }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.name).toBe("Updated");
    });

    it("returns 404 when missing", async () => {
        mocks.getExpenseCategoryById.mockResolvedValue(null);
        const res = await PATCH(
            new Request("http://localhost/api/expenses/categories/missing", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "X" }),
            }),
            { params: Promise.resolve({ id: "missing" }) },
        );
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/expenses/categories/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getExpenseCategoryById.mockResolvedValue({
            id: "cat-1",
            name: "Rent",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mocks.dbDeleteWhere.mockResolvedValue(undefined);
    });

    it("deletes and cascades subcategories at the database", async () => {
        const res = await DELETE(
            new Request("http://localhost/api/expenses/categories/cat-1"),
            { params: Promise.resolve({ id: "cat-1" }) },
        );
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            data: { deleted: true },
        });
    });
});
