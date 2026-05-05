import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseCategoryPatchSchema } from "@/db/schemas/expense-category";
import { expenseCategoryTable } from "@/db/tables/expenseCategoryTable";
import { db } from "@/lib/db";
import { getExpenseCategoryById } from "@/services/expense/list-expense-master-data";
import { revalidateExpenseDashboardPaths } from "@/services/expense/revalidate-expenses";

export const runtime = "nodejs";

export async function PATCH(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return apiError({
            status: 400,
            code: "INVALID_JSON",
            message: "Invalid JSON",
        });
    }

    const parsed = expenseCategoryPatchSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense category patch.",
            details: parsed.error.flatten(),
        });
    }

    const existing = await getExpenseCategoryById(id);
    if (!existing) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense category not found",
        });
    }

    const [row] = await db
        .update(expenseCategoryTable)
        .set({
            ...(parsed.data.name !== undefined
                ? { name: parsed.data.name }
                : {}),
            updatedAt: new Date(),
        })
        .where(eq(expenseCategoryTable.id, id))
        .returning();

    revalidateExpenseDashboardPaths();
    return apiSuccess(row);
}

export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const existing = await getExpenseCategoryById(id);
    if (!existing) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense category not found",
        });
    }

    await db.delete(expenseCategoryTable).where(eq(expenseCategoryTable.id, id));

    revalidateExpenseDashboardPaths();
    return apiSuccess({ deleted: true });
}
