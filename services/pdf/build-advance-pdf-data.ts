import type { AdvanceVoucherData } from "@/services/pdf/react-pdf";
import { getBundledApproverSignatureDataUrl } from "@/services/pdf/approver-signature";
import { getAdvanceRequestByIdWithWorker } from "@/utils/advance/queries";

/**
 * Assembles the live {@link AdvanceVoucherData} for an advance request.
 * Returns `null` when the request does not exist. Shared by the pdf-data API
 * route and the server-side PDF regenerator.
 */
export async function buildAdvancePdfData(
    advanceRequestId: string,
): Promise<AdvanceVoucherData | null> {
    const detail = await getAdvanceRequestByIdWithWorker(advanceRequestId);

    if (!detail) {
        return null;
    }

    return {
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
        managerSignature: getBundledApproverSignatureDataUrl(),
        managerSignatureDate: detail.managerSignatureDate,
    };
}
