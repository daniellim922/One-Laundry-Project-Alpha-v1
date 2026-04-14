import { requireApiPermission } from "@/app/api/_shared/auth";
import { apiSuccess } from "@/app/api/_shared/responses";
import { listDraftPayrollsForSettlement } from "@/services/payroll/list-draft-payrolls-for-settlement";

export async function GET(request: Request) {
    const permission = await requireApiPermission(request, "Payroll", "read");
    if (permission instanceof Response) {
        return permission;
    }

    const rows = await listDraftPayrollsForSettlement();
    return apiSuccess(rows);
}
