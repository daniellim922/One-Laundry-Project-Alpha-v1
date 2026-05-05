import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseStatusPatchRequestSchema } from "@/db/schemas/api";
import { expensesTable } from "@/db/tables/expensesTable";
import { db } from "@/lib/db";
import { getExpenseDetailById } from "@/services/expense/list-expenses";
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

    const parsed = expenseStatusPatchRequestSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense status transition request.",
            details: parsed.error.flatten(),
        });
    }

    const existing = await db
        .select({
            id: expensesTable.id,
            status: expensesTable.status,
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .limit(1);

    const row = existing[0];
    if (!row) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense not found",
        });
    }

    if (row.status !== "Expense Submitted") {
        return apiError({
            status: 409,
            code: "INVALID_STATUS_TRANSITION",
            message:
                "Only expenses in Expense Submitted status can be marked Expense Paid.",
        });
    }

    await db
        .update(expensesTable)
        .set({
            status: parsed.data.status,
            updatedAt: new Date(),
        })
        .where(eq(expensesTable.id, id));

    const refreshed = await getExpenseDetailById(id);
    revalidateExpenseDashboardPaths();
    return apiSuccess(refreshed);
}
