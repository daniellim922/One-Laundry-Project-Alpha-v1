import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiSuccess } from "@/app/api/_shared/responses";
import { listDraftPayrollsForSettlement } from "@/services/payroll/list-draft-payrolls-for-settlement";

export async function GET() {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const rows = await listDraftPayrollsForSettlement();
    return apiSuccess(rows);
}
