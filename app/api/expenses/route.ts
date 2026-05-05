import * as z from "zod";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import {
    listExpensesWithCategories,
    type ExpenseListFilters,
} from "@/services/expense/list-expenses";

export const runtime = "nodejs";

const expenseListQuerySchema = z.object({
    categoryName: z.string().optional(),
    subcategoryName: z.string().optional(),
    status: z.enum(["Expense Submitted", "Expense Paid"]).optional(),
});

export async function GET(request: Request) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const raw = {
        categoryName: url.searchParams.get("categoryName") ?? undefined,
        subcategoryName: url.searchParams.get("subcategoryName") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
    };

    const parsed = expenseListQuerySchema.safeParse(raw);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense list query.",
            details: parsed.error.flatten(),
        });
    }

    const filters: ExpenseListFilters = {};
    if (parsed.data.categoryName)
        filters.categoryName = parsed.data.categoryName;
    if (parsed.data.subcategoryName)
        filters.subcategoryName = parsed.data.subcategoryName;
    if (parsed.data.status) filters.status = parsed.data.status;

    const data = await listExpensesWithCategories(filters);
    return apiSuccess(data);
}
