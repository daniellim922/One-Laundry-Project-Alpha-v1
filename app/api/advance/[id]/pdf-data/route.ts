import { requireCurrentApiUser } from "@/app/api/_shared/auth";
import { apiError, apiSuccess } from "@/app/api/_shared/responses";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";
import type { AdvanceVoucherData } from "@/services/pdf/react-pdf";

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const auth = await requireCurrentApiUser();
    if (auth instanceof Response) return auth;

    const { id } = await ctx.params;
    const detail = await getAdvanceRequestByIdWithWorker(id);

    if (!detail) {
        return apiError({
            status: 404,
            code: "NOT_FOUND",
            message: "Advance request not found",
        });
    }

    const data: AdvanceVoucherData = {
        request: {
            workerName: detail.request.workerName,
            amountRequested: detail.request.amountRequested,
            status: detail.request.status,
            requestDate: detail.request.requestDate,
        },
        advances: detail.advances.map((a) => ({
            id: a.id,
            amount: a.amount,
            status: a.status,
            repaymentDate: a.repaymentDate,
        })),
        employeeSignature: detail.employeeSignature,
        employeeSignatureDate: detail.employeeSignatureDate,
        managerSignature: detail.managerSignature,
        managerSignatureDate: detail.managerSignatureDate,
    };

    return apiSuccess(data);
}
