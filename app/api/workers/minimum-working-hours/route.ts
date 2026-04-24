import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { workerMinimumHoursBatchRequestSchema } from "@/db/schemas/api";
import { massUpdateWorkerMinimumWorkingHours } from "@/services/worker/mass-update-minimum-working-hours";

export async function PATCH(request: Request) {
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

    const parsedBody = workerMinimumHoursBatchRequestSchema.safeParse(body);
    if (!parsedBody.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid worker minimum-hours update request.",
            details: parsedBody.error.flatten(),
        });
    }

    const result = await massUpdateWorkerMinimumWorkingHours(parsedBody.data);

    if (result.updatedCount > 0) {
        revalidateTransportPaths([
            "/dashboard",
            "/dashboard/worker",
            "/dashboard/worker/all",
            "/dashboard/payroll",
            "/dashboard/payroll/all",
            {
                path: "/dashboard/payroll/[id]/summary",
                type: "page",
            },
            {
                path: "/dashboard/payroll/[id]/breakdown",
                type: "page",
            },
        ]);
    }

    return apiSuccess(result);
}
