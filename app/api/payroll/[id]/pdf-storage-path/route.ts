import { eq } from "drizzle-orm";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";

export async function PATCH(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
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

    if (
        !body ||
        typeof body !== "object" ||
        !("storagePath" in body) ||
        typeof (body as Record<string, unknown>).storagePath !== "string"
    ) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Body must contain a string `storagePath` field.",
        });
    }

    const { id } = await ctx.params;
    const storagePath = (body as { storagePath: string }).storagePath;

    const [updated] = await db
        .update(payrollTable)
        .set({ pdfStoragePath: storagePath })
        .where(eq(payrollTable.id, id))
        .returning({ id: payrollTable.id });

    if (!updated) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Payroll not found",
        });
    }

    return apiSuccess({ id: updated.id, pdfStoragePath: storagePath });
}
