import type { AdvanceRequestFormValues } from "@/db/schemas/advance-request";
import type { SaveAdvanceRequestInput } from "@/services/advance/save-advance-request";
import type { AdvanceRequestDetail } from "@/utils/advance/queries";
import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";

export type AdvanceRequestWorkerOption = { id: string; name: string };

export const EMPTY_INSTALLMENT_ROW = {
    amount: undefined,
    repaymentDate: "",
    status: "Installment Loan" as const,
};

export function createAdvanceRequestDefaultValues(
    bundledManagerSignatureDataUrl: string,
    initialWorkerId?: string,
): AdvanceRequestFormValues {
    return {
        workerId: initialWorkerId ?? "",
        requestDate: dateToLocalIsoYmd(),
        amount: undefined,
        purpose: "",
        employeeSignature: "",
        managerSignature: bundledManagerSignatureDataUrl,
        installmentAmounts: [EMPTY_INSTALLMENT_ROW],
    };
}

export function detailToDefaultValues(
    detail: AdvanceRequestDetail,
    bundledManagerSignatureDataUrl: string,
): AdvanceRequestFormValues {
    const { request, advances, purpose } = detail;
    return {
        workerId: request.workerId,
        requestDate: request.requestDate,
        amount: request.amountRequested,
        purpose: purpose ?? "",
        employeeSignature: detail.employeeSignature ?? "",
        managerSignature: bundledManagerSignatureDataUrl,
        installmentAmounts:
            advances.length > 0
                ? advances.map((a) => ({
                      amount: a.amount,
                      repaymentDate: a.repaymentDate ?? "",
                      status: a.status,
                  }))
                : [EMPTY_INSTALLMENT_ROW],
    };
}

/** Map validated form values to the server-action input contract. */
export function toSaveAdvanceRequestInput(
    data: AdvanceRequestFormValues,
): SaveAdvanceRequestInput {
    const amount = data.amount;
    if (
        typeof amount !== "number" ||
        !Number.isInteger(amount) ||
        amount <= 0
    ) {
        throw new Error("Amount is required");
    }

    return {
        workerId: data.workerId,
        requestDate: data.requestDate,
        amount,
        purpose: data.purpose,
        employeeSignature: data.employeeSignature,
        managerSignature: data.managerSignature,
        installmentAmounts: data.installmentAmounts,
    };
}
