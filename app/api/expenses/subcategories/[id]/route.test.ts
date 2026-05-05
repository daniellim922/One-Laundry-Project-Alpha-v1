import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    getExpenseSubcategoryById: vi.fn(),
    getExpenseCategoryById: vi.fn(),
    dbUpdateWhere: vi.fn(),
    dbDeleteWhere: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expense-master-data", () => ({
    getExpenseSubcategoryById: (...args: unknown[]) =>
        mocks.getExpenseSubcategoryById(...args),
    getExpenseCategoryById: (...args: unknown[]) =>
        mocks.getExpenseCategoryById(...args),
}));

vi.mock("@/lib/db", () => ({
    db: {
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => mocks.dbUpdateWhere()),
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

import { DELETE, PATCH } from "@/app/api/expenses/subcategories/[id]/route";

const CAT_1 = "00000000-0000-4000-8000-000000000001";
const CAT_2 = "00000000-0000-4000-8000-000000000002";
const SUB_1 = "00000000-0000-4000-8000-0000000000aa";

describe("PATCH /api/expenses/subcategories/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getExpenseSubcategoryById
            .mockResolvedValueOnce({
                id: SUB_1,
                categoryId: CAT_1,
                name: "Petrol",
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .mockResolvedValueOnce({
                id: SUB_1,
                categoryId: CAT_2,
                name: "Renamed",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        mocks.getExpenseCategoryById.mockResolvedValue({
            id: CAT_2,
            name: "Ops",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mocks.dbUpdateWhere.mockResolvedValue(undefined);
    });

    it("updates and refreshes subcategory", async () => {
        const res = await PATCH(
            new Request(`http://localhost/api/expenses/subcategories/${SUB_1}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ categoryId: CAT_2, name: "Renamed" }),
            }),
            { params: Promise.resolve({ id: SUB_1 }) },
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.name).toBe("Renamed");
    });
});

describe("DELETE /api/expenses/subcategories/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.getExpenseSubcategoryById.mockResolvedValue({
            id: SUB_1,
            categoryId: CAT_1,
            name: "Petrol",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        mocks.dbDeleteWhere.mockResolvedValue(undefined);
    });

    it("deletes subcategory", async () => {
        const res = await DELETE(
            new Request(`http://localhost/api/expenses/subcategories/${SUB_1}`),
            { params: Promise.resolve({ id: SUB_1 }) },
        );
        expect(res.status).toBe(200);
    });
});
