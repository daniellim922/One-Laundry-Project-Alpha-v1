import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { settlePayroll } from "@/services/payroll/settle-payroll";

export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await context.params;
    const result = await settlePayroll({ payrollId: id });

    if (!result.success) {
        return apiError({
            status:
                result.code === "NOT_FOUND"
                    ? 404
                    : result.code === "INVALID_STATE"
                      ? 409
                      : 500,
            code: result.code,
            message: result.error,
        });
    }

    revalidateTransportPaths([
        `/dashboard/payroll/${id}/breakdown`,
        `/dashboard/payroll/${id}/summary`,
        "/dashboard/payroll",
        "/dashboard/payroll/all",
        "/dashboard/advance",
        "/dashboard/advance/all",
        "/dashboard/timesheet",
        "/dashboard/timesheet/all",
    ]);

    return apiSuccess(result);
}
