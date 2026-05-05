import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { expenseSupplierFormSchema } from "@/db/schemas/expense-supplier";
import { expenseSupplierTable } from "@/db/tables/expenseSupplierTable";
import { db } from "@/lib/db";
import { listExpenseSuppliers } from "@/services/expense/list-expense-master-data";
import { revalidateExpenseDashboardPaths } from "@/services/expense/revalidate-expenses";

export const runtime = "nodejs";

export async function GET() {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const rows = await listExpenseSuppliers();
    return apiSuccess(rows);
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

    const parsed = expenseSupplierFormSchema.safeParse(body);
    if (!parsed.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid expense supplier payload.",
            details: parsed.error.flatten(),
        });
    }

    const [row] = await db
        .insert(expenseSupplierTable)
        .values({ name: parsed.data.name })
        .returning();

    revalidateExpenseDashboardPaths();
    return apiSuccess(row, 201);
}
