import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import {
    assertDraftPayrollVoucher,
    normalizeEmploymentTypeForVoucher,
    persistDraftPayrollVoucherUpdate,
    validatePayrollAndVoucherIds,
    type VoucherMutationResult,
} from "@/services/payroll/_shared/voucher-update-pipeline";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

export type UpdateVoucherDaysResult = VoucherMutationResult;

export async function updateVoucherDays(input: {
    payrollId: string;
    voucherId: string;
    restDays: number;
    publicHolidays: number;
}): Promise<UpdateVoucherDaysResult> {
    const identifiers = validatePayrollAndVoucherIds(
        input.payrollId,
        input.voucherId,
    );
    if (!identifiers.ok) {
        return identifiers.result;
    }
    const { payrollId, voucherId } = identifiers;
    const { restDays, publicHolidays } = input;
    if (!Number.isFinite(restDays) || restDays < 0) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid restDays",
        };
    }
    if (!Number.isFinite(publicHolidays) || publicHolidays < 0) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid publicHolidays",
        };
    }

    const guard = await assertDraftPayrollVoucher(
        payrollId,
        voucherId,
        "Only Draft payrolls can edit voucher days",
    );
    if (!guard.ok) {
        return guard.result;
    }

    const [voucher] = await db
        .select({
            employmentType: payrollVoucherTable.employmentType,
            totalHoursWorked: payrollVoucherTable.totalHoursWorked,
            minimumWorkingHours: payrollVoucherTable.minimumWorkingHours,
            monthlyPay: payrollVoucherTable.monthlyPay,
            hourlyRate: payrollVoucherTable.hourlyRate,
            restDayRate: payrollVoucherTable.restDayRate,
            cpf: payrollVoucherTable.cpf,
            advance: payrollVoucherTable.advance,
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
    const minimumWorkingHours =
        voucher.minimumWorkingHours != null
            ? Number(voucher.minimumWorkingHours)
            : null;

    const voucherValues = buildDraftPayrollVoucherValues({
        employment: {
            employmentType: normalizeEmploymentTypeForVoucher(
                voucher.employmentType,
            ),
            employmentArrangement: "Local Worker",
            minimumWorkingHours,
            monthlyPay:
                voucher.monthlyPay != null ? Number(voucher.monthlyPay) : null,
            hourlyRate:
                voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
            restDayRate:
                voucher.restDayRate != null ? Number(voucher.restDayRate) : null,
            cpf: voucher.cpf != null ? Number(voucher.cpf) : null,
            paymentMethod: "Cash",
            payNowPhone: null,
            bankAccountNumber: null,
        },
        totalHoursWorked,
        restDays,
        publicHolidays,
        advanceTotal: voucher.advance ?? 0,
    });

    const persist = await persistDraftPayrollVoucherUpdate({
        voucherId,
        voucherValues,
        logLabel: "Error updating voucher days",
        userFacingError: "Failed to update voucher days",
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
