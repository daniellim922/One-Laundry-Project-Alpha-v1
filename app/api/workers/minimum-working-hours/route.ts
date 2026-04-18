import { z } from "zod";

import { requireCurrentApiAdminUser } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { massUpdateWorkerMinimumWorkingHours } from "@/services/worker/mass-update-minimum-working-hours";

const requestSchema = z.object({
    updates: z.array(
        z.object({
            workerId: z.string(),
            minimumWorkingHours: z.number(),
        }),
    ),
});

export async function PATCH(request: Request) {
    const auth = await requireCurrentApiAdminUser();
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
            message: "Invalid worker minimum-hours update request.",
            details: parsedBody.error.flatten(),
        });
    }

    const result = await massUpdateWorkerMinimumWorkingHours(parsedBody.data);

    if (result.updatedCount > 0) {
        revalidateTransportPaths([
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
