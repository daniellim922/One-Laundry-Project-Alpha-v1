import { requireCurrentApiAdminUser } from "@/app/api/_shared/auth";
import { apiSuccess } from "@/app/api/_shared/responses";
import { listPayrollsForDownload } from "@/services/payroll/list-payrolls-for-download";

export async function GET() {
    const auth = await requireCurrentApiAdminUser();
    if (auth instanceof Response) {
        return auth;
    }

    const rows = await listPayrollsForDownload();
    return apiSuccess(rows);
}
