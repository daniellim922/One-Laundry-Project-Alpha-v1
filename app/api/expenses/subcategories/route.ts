import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseSubcategoryFormSchema } from "@/db/schemas/expense-category";
import { expenseSubcategoryTable } from "@/db/tables/expenseSubcategoryTable";
import { db } from "@/lib/db";
import { getExpenseCategoryById } from "@/services/expense/list-expense-master-data";
import { revalidateExpenseDashboardPaths } from "@/services/expense/revalidate-expenses";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

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

    const parsed = expenseSubcategoryFormSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense subcategory payload.",
            details: parsed.error.flatten(),
        });
    }

    const category = await getExpenseCategoryById(parsed.data.categoryId);
    if (!category) {
        return apiError({
            status: 400,
            code: "UNKNOWN_CATEGORY",
            message: "Parent expense category does not exist.",
        });
    }

    const [row] = await db
        .insert(expenseSubcategoryTable)
        .values({
            categoryId: parsed.data.categoryId,
            name: parsed.data.name,
        })
        .returning();

    revalidateExpenseDashboardPaths();
    return apiSuccess(row, 201);
}
