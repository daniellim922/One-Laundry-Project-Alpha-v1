import { z } from "zod";

import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { settleDraftPayrolls } from "@/services/payroll/settle-draft-payrolls";

const requestSchema = z.object({
    payrollIds: z.array(z.string()),
});

export async function POST(request: Request) {
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

    const parsedBody = requestSchema.safeParse(body);
    if (!parsedBody.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid payroll settlement request.",
            details: parsedBody.error.flatten(),
        });
    }

    const result = await settleDraftPayrolls(parsedBody.data);

    if (!result.success) {
        return apiError({
            status:
                result.code === "VALIDATION_ERROR"
                    ? 400
                    : result.code === "NOT_FOUND"
                      ? 404
                      : result.code === "INVALID_STATE"
                        ? 409
                        : 500,
            code: result.code,
            message: result.error,
        });
    }

    revalidateTransportPaths([
        ...result.settledPayrollIds.flatMap((payrollId) => [
            `/dashboard/payroll/${payrollId}/breakdown`,
            `/dashboard/payroll/${payrollId}/summary`,
        ]),
        "/dashboard/payroll",
        "/dashboard/payroll/all",
        "/dashboard/advance",
        "/dashboard/advance/all",
        "/dashboard/timesheet",
        "/dashboard/timesheet/all",
    ]);

    return apiSuccess(result);
}
