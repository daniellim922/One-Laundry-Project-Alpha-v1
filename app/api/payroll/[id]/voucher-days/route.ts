import { handlePayrollVoucherJsonPatch } from "@/app/api/_shared/payroll-voucher-patch";
import { payrollVoucherDaysUpdateRequestSchema } from "@/db/schemas/api";
import { updateVoucherDays } from "@/services/payroll/update-voucher-days";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    return handlePayrollVoucherJsonPatch(request, context, {
        schema: payrollVoucherDaysUpdateRequestSchema,
        validationMessage: "Invalid payroll voucher-day update request.",
        execute: (args) => updateVoucherDays(args),
        logLabel: "voucher days",
    });
}
