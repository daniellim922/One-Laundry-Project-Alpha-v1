import { z } from "zod";

import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { importAttendRecordTimesheet } from "@/services/timesheet/import-attend-record-timesheet";

const attendRecordSchema = z.object({
    attendanceDate: z.object({
        startDate: z.string(),
        endDate: z.string(),
    }),
    tablingDate: z.string(),
    workers: z.array(
        z.object({
            userId: z.string(),
            name: z.string(),
            dates: z.array(
                z.object({
                    dateIn: z.string(),
                    timeIn: z.string(),
                    dateOut: z.string(),
                    timeOut: z.string(),
                    hours: z.number().optional(),
                }),
            ),
        }),
    ),
});

export async function POST(request: Request) {
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

    const parsedBody = attendRecordSchema.safeParse(body);
    if (!parsedBody.success) {
        return apiError({
            status: 400,
            code: "VALIDATION_ERROR",
            message: "Invalid timesheet import request.",
            details: parsedBody.error.flatten(),
        });
    }

    const result = await importAttendRecordTimesheet(parsedBody.data);

    if (result.imported > 0) {
        revalidateTransportPaths([
            "/dashboard/timesheet",
            "/dashboard/timesheet/all",
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
