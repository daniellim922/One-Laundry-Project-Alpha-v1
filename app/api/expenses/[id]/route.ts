import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
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
