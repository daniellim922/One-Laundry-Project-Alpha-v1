import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { payrollVoucherPayRateUpdateRequestSchema } from "@/db/schemas/api";
import { updateVoucherPayRate } from "@/services/payroll/update-voucher-pay-rates";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

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

    const parsedBody = payrollVoucherPayRateUpdateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid payroll voucher pay-rate update request.",
            details: parsedBody.error.flatten(),
        });
    }

    const { id } = await context.params;
    const result = await updateVoucherPayRate({
        payrollId: id,
        ...parsedBody.data,
    });

    if (!result.success) {
        return apiError({
            status:
                result.code === "VALIDATION_ERROR"
                    ? 400
                    : result.code === "NOT_FOUND"
                      ? 404
                      : result.code === "CONFLICT"
                        ? 409
                        : 500,
            code: result.code,
            message: result.error,
        });
    }

    try {
        revalidateTransportPaths([
            `/dashboard/payroll/${id}/breakdown`,
            `/dashboard/payroll/${id}/summary`,
            "/dashboard/payroll",
            "/dashboard/payroll/all",
        ]);
    } catch (e) {
        console.error("revalidateTransportPaths after voucher pay rate", e);
    }

    return apiSuccess(result);
}
