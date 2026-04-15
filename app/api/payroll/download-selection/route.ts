import { apiSuccess } from "@/app/api/_shared/responses";
import { listPayrollsForDownload } from "@/services/payroll/list-payrolls-for-download";

export async function GET() {
    const rows = await listPayrollsForDownload();
    return apiSuccess(rows);
}
