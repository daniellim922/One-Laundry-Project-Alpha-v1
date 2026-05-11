import { eq } from "drizzle-orm";

import { expensesTable } from "@/db/tables/expensesTable";
import { db } from "@/lib/db";

import { revalidateExpenseDashboardPaths } from "./revalidate-expenses";

export type DeleteExpenseResult =
    | { ok: true }
    | { ok: false; kind: "NOT_FOUND" | "DELETE_PAID_FORBIDDEN" };

export async function deleteExpenseByIdIfSubmitted(
    id: string,
): Promise<DeleteExpenseResult> {
    const [row] = await db
        .select({
            id: expensesTable.id,
            status: expensesTable.status,
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .limit(1);

    if (!row) {
        return { ok: false, kind: "NOT_FOUND" };
    }

    if (row.status !== "Expense Submitted") {
        return { ok: false, kind: "DELETE_PAID_FORBIDDEN" };
    }

    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    revalidateExpenseDashboardPaths();
    return { ok: true };
}
