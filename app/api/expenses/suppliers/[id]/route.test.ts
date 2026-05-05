import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    dbDeleteReturning: vi.fn(),
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

vi.mock("@/lib/db", () => ({
    db: {
        delete: vi.fn(() => ({
            where: vi.fn(() => ({
                returning: (...args: unknown[]) =>
                    mocks.dbDeleteReturning(...args),
            })),
        })),
    },
}));

vi.mock("@/services/expense/revalidate-expenses", () => ({
    revalidateExpenseDashboardPaths: vi.fn(),
}));

import { DELETE } from "@/app/api/expenses/suppliers/[id]/route";

describe("DELETE /api/expenses/suppliers/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticatedApiOperator(mocks);
    });

    it("deletes when found", async () => {
        mocks.dbDeleteReturning.mockResolvedValue([{ id: "sup-1" }]);
        const res = await DELETE(
            new Request("http://localhost/api/expenses/suppliers/sup-1"),
            { params: Promise.resolve({ id: "sup-1" }) },
        );
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            data: { deleted: true },
        });
    });

    it("returns 404 when missing", async () => {
        mocks.dbDeleteReturning.mockResolvedValue([]);
        const res = await DELETE(
            new Request("http://localhost/api/expenses/suppliers/missing"),
            {
                params: Promise.resolve({
                    id: "00000000-0000-4000-8000-00000000dead",
                }),
            },
        );
        expect(res.status).toBe(404);
    });
});
