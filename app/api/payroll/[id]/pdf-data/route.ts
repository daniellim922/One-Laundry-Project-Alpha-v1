import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { buildPayrollPdfData } from "@/services/pdf/build-payroll-pdf-data";

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;
    const data = await buildPayrollPdfData(id);

    if (!data) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Payroll not found",
        });
    }

    return apiSuccess(data);
}
