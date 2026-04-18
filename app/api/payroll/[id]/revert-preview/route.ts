import { requireCurrentApiAdminUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { getPayrollRevertPreview } from "@/services/payroll/get-revert-preview";

export async function GET(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiAdminUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await context.params;
    const result = await getPayrollRevertPreview(id);

    if ("error" in result) {
        return apiError({
            status: result.code === "NOT_FOUND" ? 404 : 409,
            code: result.code,
            message: result.error,
        });
    }

    return apiSuccess(result.data);
}
