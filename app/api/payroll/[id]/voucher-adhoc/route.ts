import { handlePayrollVoucherJsonPatch } from "@/app/api/_shared/payroll-voucher-patch";
import { payrollVoucherAdhocUpdateRequestSchema } from "@/db/schemas/api";
import { updateVoucherAdhoc } from "@/services/payroll/update-voucher-adhoc";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    return handlePayrollVoucherJsonPatch(request, context, {
        schema: payrollVoucherAdhocUpdateRequestSchema,
        validationMessage: "Invalid payroll voucher adhoc update request.",
        execute: (args) => updateVoucherAdhoc(args),
        logLabel: "voucher adhoc",
    });
}
