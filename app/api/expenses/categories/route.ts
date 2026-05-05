import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseCategoryFormSchema } from "@/db/schemas/expense-category";
import { expenseCategoryTable } from "@/db/tables/expenseCategoryTable";
import { db } from "@/lib/db";
import { listExpenseCategoriesWithSubcategories } from "@/services/expense/list-expense-master-data";
import { revalidateExpenseDashboardPaths } from "@/services/expense/revalidate-expenses";

export const runtime = "nodejs";

export async function GET() {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const data = await listExpenseCategoriesWithSubcategories();
    return apiSuccess(data);
}

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

    const parsed = expenseCategoryFormSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense category payload.",
            details: parsed.error.flatten(),
        });
    }

    const [row] = await db
        .insert(expenseCategoryTable)
        .values({
            name: parsed.data.name,
        })
        .returning();

    revalidateExpenseDashboardPaths();
    return apiSuccess(row, 201);
}
