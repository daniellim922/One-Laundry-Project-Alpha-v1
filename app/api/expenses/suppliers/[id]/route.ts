import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseSupplierTable } from "@/db/tables/expenseSupplierTable";
import { db } from "@/lib/db";
import { revalidateExpenseDashboardPaths } from "@/services/expense/revalidate-expenses";

export const runtime = "nodejs";

export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const deleted = await db
        .delete(expenseSupplierTable)
        .where(eq(expenseSupplierTable.id, id))
        .returning({ id: expenseSupplierTable.id });

    if (deleted.length === 0) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense supplier not found",
        });
    }

    revalidateExpenseDashboardPaths();
    return apiSuccess({ deleted: true });
}
