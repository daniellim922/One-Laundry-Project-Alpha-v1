import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    dbSelectLimit: vi.fn(),
    dbDeleteWhere: vi.fn(),
    revalidateExpenseDashboardPaths: vi.fn(),
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
        delete: vi.fn(() => ({
            where: vi.fn(() => mocks.dbDeleteWhere()),
        })),
    },
}));

vi.mock("./revalidate-expenses", () => ({
    revalidateExpenseDashboardPaths: (...args: unknown[]) =>
        mocks.revalidateExpenseDashboardPaths(...args),
}));

import { deleteExpenseByIdIfSubmitted } from "./delete-expense";

const EXP_ID = "00000000-0000-4000-8000-000000000099";

describe("deleteExpenseByIdIfSubmitted", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.dbDeleteWhere.mockResolvedValue(undefined);
    });

    it("returns NOT_FOUND when expense is missing", async () => {
        mocks.dbSelectLimit.mockResolvedValue([]);

        const result = await deleteExpenseByIdIfSubmitted(EXP_ID);

        expect(result).toEqual({ ok: false, kind: "NOT_FOUND" });
        expect(mocks.dbDeleteWhere).not.toHaveBeenCalled();
        expect(mocks.revalidateExpenseDashboardPaths).not.toHaveBeenCalled();
    });

    it("returns DELETE_PAID_FORBIDDEN when status is Expense Paid", async () => {
        mocks.dbSelectLimit.mockResolvedValue([
            { id: EXP_ID, status: "Expense Paid" },
        ]);

        const result = await deleteExpenseByIdIfSubmitted(EXP_ID);

        expect(result).toEqual({ ok: false, kind: "DELETE_PAID_FORBIDDEN" });
        expect(mocks.dbDeleteWhere).not.toHaveBeenCalled();
        expect(mocks.revalidateExpenseDashboardPaths).not.toHaveBeenCalled();
    });

    it("deletes Expense Submitted rows and revalidates", async () => {
        mocks.dbSelectLimit.mockResolvedValue([
            { id: EXP_ID, status: "Expense Submitted" },
        ]);

        const result = await deleteExpenseByIdIfSubmitted(EXP_ID);

        expect(result).toEqual({ ok: true });
        expect(mocks.dbDeleteWhere).toHaveBeenCalled();
        expect(mocks.revalidateExpenseDashboardPaths).toHaveBeenCalledTimes(1);
    });
});
