import { handlePayrollVoucherJsonPatch } from "@/app/api/_shared/payroll-voucher-patch";
import { payrollVoucherPayRateUpdateRequestSchema } from "@/db/schemas/api";
import { updateVoucherPayRate } from "@/services/payroll/update-voucher-pay-rates";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    return handlePayrollVoucherJsonPatch(request, context, {
        schema: payrollVoucherPayRateUpdateRequestSchema,
        validationMessage: "Invalid payroll voucher pay-rate update request.",
        execute: (args) => updateVoucherPayRate(args),
        logLabel: "voucher pay rate",
    });
}
