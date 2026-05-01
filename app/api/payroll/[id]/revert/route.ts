import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import {
    payrollTransitionFailureResponse,
    revalidateAfterPayrollMutation,
} from "@/app/api/_shared/payroll-transition-api";
import { apiSuccess } from "@/app/api/_shared/responses";
import { revertPayroll } from "@/services/payroll/revert-payroll";

export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) {
        return auth;
    }

    const { id } = await context.params;
    const result = await revertPayroll({ payrollId: id });

    if (!result.success) {
        return payrollTransitionFailureResponse(result);
    }

    revalidateAfterPayrollMutation(id);

    return apiSuccess(result);
}
