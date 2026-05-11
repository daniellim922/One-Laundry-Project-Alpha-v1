import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { deleteExpenseByIdIfSubmitted } from "@/services/expense/delete-expense";
import { getExpenseDetailById } from "@/services/expense/list-expenses";

export const runtime = "nodejs";

export async function GET(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const row = await getExpenseDetailById(id);
    if (!row) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Expense not found",
        });
    }

    return apiSuccess(row);
}

export async function DELETE(
    _request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;

    const result = await deleteExpenseByIdIfSubmitted(id);
    if (!result.ok) {
        if (result.kind === "NOT_FOUND") {
            return apiError({
                status: 404,
                code: "NOT_FOUND",
                message: "Expense not found",
            });
        }
        return apiError({
            status: 409,
            code: "EXPENSE_PAID_DELETE_FORBIDDEN",
            message:
                "Only Expense Submitted expenses can be deleted. Revert to Submitted first.",
        });
    }

    return apiSuccess({ deleted: true });
}
