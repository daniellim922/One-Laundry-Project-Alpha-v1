import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    listExpenseSuppliers: vi.fn(),
    dbInsertReturning: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/services/expense/list-expense-master-data", () => ({
    listExpenseSuppliers: (...args: unknown[]) =>
        mocks.listExpenseSuppliers(...args),
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

import { GET, POST } from "@/app/api/expenses/suppliers/route";

describe("GET /api/expenses/suppliers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.listExpenseSuppliers.mockResolvedValue([
            {
                id: "sup-1",
                name: "Acme",
                gstRegNumber: "M90371234X",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    });

    it("lists suppliers", async () => {
        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data[0].name).toBe("Acme");
        expect(json.data[0].gstRegNumber).toBe("M90371234X");
    });
});

describe("POST /api/expenses/suppliers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
        mocks.dbInsertReturning.mockResolvedValue([
            {
                id: "new-sup",
                name: "Beta Supplies",
                gstRegNumber: "M12345678X",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    });

    it("creates a supplier", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/suppliers", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Beta Supplies" }),
            }),
        );
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.id).toBe("new-sup");
    });

    it("creates a supplier with optional GST registration number", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/suppliers", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name: "Gamma Supplies",
                    gstRegNumber: "M99999999X",
                }),
            }),
        );
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.ok).toBe(true);
    });

    it("returns 400 on invalid payload", async () => {
        const res = await POST(
            new Request("http://localhost/api/expenses/suppliers", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "" }),
            }),
        );
        expect(res.status).toBe(400);
    });
});
