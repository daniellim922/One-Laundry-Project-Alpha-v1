import { apiSuccess } from "@/app/api/_shared/responses";
import { listDraftPayrollsForSettlement } from "@/services/payroll/list-draft-payrolls-for-settlement";

export async function GET() {
    const rows = await listDraftPayrollsForSettlement();
    return apiSuccess(rows);
}
