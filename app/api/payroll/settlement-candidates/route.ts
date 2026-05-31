import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiSuccess } from "@/app/api/_shared/responses";
import { queryPayrollSelectionRows } from "@/services/payroll/_shared/query-payroll-selection-rows";

export async function GET() {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const rows = await queryPayrollSelectionRows("Draft");
    return apiSuccess(rows);
}
