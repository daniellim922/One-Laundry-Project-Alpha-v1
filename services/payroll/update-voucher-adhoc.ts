import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import type { AdhocLineItem } from "@/db/tables/payrollVoucherTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import {
    assertDraftPayrollVoucher,
    normalizeEmploymentTypeForVoucher,
    persistDraftPayrollVoucherUpdate,
    validatePayrollAndVoucherIds,
    type VoucherMutationResult,
} from "@/services/payroll/_shared/voucher-update-pipeline";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

export type UpdateVoucherAdhocResult = VoucherMutationResult;

export async function updateVoucherAdhoc(input: {
    payrollId: string;
    voucherId: string;
    adhoc: AdhocLineItem[];
}): Promise<UpdateVoucherAdhocResult> {
    const identifiers = validatePayrollAndVoucherIds(
        input.payrollId,
        input.voucherId,
    );
    if (!identifiers.ok) {
        return identifiers.result;
    }
    const { payrollId, voucherId } = identifiers;
    const { adhoc } = input;

    const guard = await assertDraftPayrollVoucher(
        payrollId,
        voucherId,
        "Only Draft payrolls can edit voucher adhoc line items",
    );
    if (!guard.ok) {
        return guard.result;
    }

    const [voucher] = await db
        .select({
            employmentType: payrollVoucherTable.employmentType,
            employmentArrangement: payrollVoucherTable.employmentArrangement,
            shiftPattern: payrollVoucherTable.shiftPattern,
            totalHoursWorked: payrollVoucherTable.totalHoursWorked,
            minimumWorkingHours: payrollVoucherTable.minimumWorkingHours,
            monthlyPay: payrollVoucherTable.monthlyPay,
            hourlyRate: payrollVoucherTable.hourlyRate,
            restDayRate: payrollVoucherTable.restDayRate,
            cpf: payrollVoucherTable.cpf,
            advance: payrollVoucherTable.advance,
            restDays: payrollVoucherTable.restDays,
            publicHolidays: payrollVoucherTable.publicHolidays,
            paymentMethod: payrollVoucherTable.paymentMethod,
            payNowPhone: payrollVoucherTable.payNowPhone,
            bankAccountNumber: payrollVoucherTable.bankAccountNumber,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, voucherId))
        .limit(1);

    if (!voucher) {
        return {
            success: false,
            code: "NOT_FOUND",
            error: "Voucher not found",
        };
    }

    const totalHoursWorked = Number(voucher.totalHoursWorked ?? 0);
    const restDays = Number(voucher.restDays ?? 0);
    const publicHolidays = Number(voucher.publicHolidays ?? 0);
    const minimumWorkingHours =
        voucher.minimumWorkingHours != null
            ? Number(voucher.minimumWorkingHours)
            : null;

    type Em = Pick<
        typeof employmentTable.$inferSelect,
        | "employmentType"
        | "employmentArrangement"
        | "shiftPattern"
        | "paymentMethod"
    >;

    const voucherValues = buildDraftPayrollVoucherValues({
        employment: {
            employmentType: normalizeEmploymentTypeForVoucher(
                voucher.employmentType,
            ),
            employmentArrangement: (voucher.employmentArrangement ??
                "Local Worker") as Em["employmentArrangement"],
            shiftPattern: voucher.shiftPattern ?? "Day Shift",
            minimumWorkingHours,
            monthlyPay:
                voucher.monthlyPay != null ? Number(voucher.monthlyPay) : null,
            hourlyRate:
                voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
            restDayRate:
                voucher.restDayRate != null ? Number(voucher.restDayRate) : null,
            cpf: voucher.cpf != null ? Number(voucher.cpf) : null,
            paymentMethod: (voucher.paymentMethod ?? "Cash") as NonNullable<
                Em["paymentMethod"]
            >,
            payNowPhone: voucher.payNowPhone,
            bankAccountNumber: voucher.bankAccountNumber,
        },
        totalHoursWorked,
        restDays,
        publicHolidays,
        advanceTotal: Number(voucher.advance ?? 0),
        adhoc,
    });

    const persist = await persistDraftPayrollVoucherUpdate({
        voucherId,
        voucherValues,
        logLabel: "Error updating voucher adhoc line items",
        userFacingError: "Failed to update voucher adhoc line items",
    });
    if (!persist.ok) {
        return persist.result;
    }

    return {
        success: true,
        payrollId,
        voucherId,
    };
}
