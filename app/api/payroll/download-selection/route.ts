import { requireApiPermission } from "@/app/api/_shared/auth";
import { apiSuccess } from "@/app/api/_shared/responses";
import { listPayrollsForDownload } from "@/services/payroll/list-payrolls-for-download";

export async function GET(request: Request) {
    const permission = await requireApiPermission(request, "Payroll", "read");
    if (permission instanceof Response) {
        return permission;
    }

    const rows = await listPayrollsForDownload();
    return apiSuccess(rows);
}
