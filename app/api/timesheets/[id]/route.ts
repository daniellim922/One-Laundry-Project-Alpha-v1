import { requireApiPermission } from "@/app/api/_shared/auth";
import { revalidateTransportPaths } from "@/app/api/_shared/revalidate";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { deleteTimesheetEntry } from "@/services/timesheet/delete-timesheet-entry";

export async function DELETE(
    request: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const permission = await requireApiPermission(request, "Timesheet", "delete");
    if (permission instanceof Response) {
        return permission;
    }

    const { id } = await ctx.params;
    const result = await deleteTimesheetEntry({ id });

    if (!result.success) {
        return apiError({
            status: result.code === "VALIDATION_ERROR" ? 400 : 500,
            code: result.code,
            message: result.error,
        });
    }

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

    return apiSuccess(result);
}
