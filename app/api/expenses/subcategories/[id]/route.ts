import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseSubcategoryPatchSchema } from "@/db/schemas/expense-category";
import { expenseSubcategoryTable } from "@/db/tables/expenseSubcategoryTable";
import { db } from "@/lib/db";
import {
    getExpenseCategoryById,
    getExpenseSubcategoryById,
} from "@/services/expense/list-expense-master-data";
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

    const parsed = expenseSubcategoryPatchSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense subcategory patch.",
            details: parsed.error.flatten(),
        });
    }

    const existing = await getExpenseSubcategoryById(id);
    if (!existing) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense subcategory not found",
        });
    }

    if (parsed.data.categoryId !== undefined) {
        const parent = await getExpenseCategoryById(parsed.data.categoryId);
        if (!parent) {
            return apiError({
                status: 400,
                code: "UNKNOWN_CATEGORY",
                message: "Parent expense category does not exist.",
            });
        }
    }

    await db
        .update(expenseSubcategoryTable)
        .set({
            ...(parsed.data.categoryId !== undefined
                ? { categoryId: parsed.data.categoryId }
                : {}),
            ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
            updatedAt: new Date(),
        })
        .where(eq(expenseSubcategoryTable.id, id));

    const refreshed = await getExpenseSubcategoryById(id);
    revalidateExpenseDashboardPaths();
    return apiSuccess(refreshed);
}

export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const existing = await getExpenseSubcategoryById(id);
    if (!existing) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense subcategory not found",
        });
    }

    await db
        .delete(expenseSubcategoryTable)
        .where(eq(expenseSubcategoryTable.id, id));

    revalidateExpenseDashboardPaths();
    return apiSuccess({ deleted: true });
}
