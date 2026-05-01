import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import {
    assertDraftPayrollVoucher,
    persistDraftPayrollVoucherUpdate,
} from "@/services/payroll/_shared/voucher-update-pipeline";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

export type VoucherPayRateField =
    | "monthlyPay"
    | "hourlyRate"
    | "restDayRate"
    | "minimumWorkingHours";

export type UpdateVoucherPayRateResult =
    | {
          success: true;
          payrollId: string;
          voucherId: string;
      }
    | {
          success: false;
          code:
              | "VALIDATION_ERROR"
              | "NOT_FOUND"
              | "CONFLICT"
              | "INTERNAL_ERROR";
          error: string;
      };

export async function updateVoucherPayRate(input: {
    payrollId: string;
    voucherId: string;
    field: VoucherPayRateField;
    value: number | null;
}): Promise<UpdateVoucherPayRateResult> {
    const { payrollId, voucherId, field, value } = input;

    if (!voucherId || !payrollId) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Missing voucherId or payrollId",
        };
    }
    if (
        !["monthlyPay", "hourlyRate", "restDayRate", "minimumWorkingHours"].includes(
            field,
        )
    ) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid field",
        };
    }
    if (field === "minimumWorkingHours") {
        if (value !== null && (!Number.isFinite(value) || value < 0)) {
            return {
                success: false,
                code: "VALIDATION_ERROR",
                error: "Invalid value",
            };
        }
    } else if (
        value === null ||
        !Number.isFinite(value) ||
        value < 0
    ) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid value",
        };
    }

    const guard = await assertDraftPayrollVoucher(
        payrollId,
        voucherId,
        "Only Draft payrolls can edit voucher pay rates",
    );
    if (!guard.ok) {
        return guard.result;
    }

    const [voucher] = await db
        .select({
            employmentType: payrollVoucherTable.employmentType,
            employmentArrangement: payrollVoucherTable.employmentArrangement,
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
        field === "minimumWorkingHours"
            ? value
            : voucher.minimumWorkingHours != null
              ? Number(voucher.minimumWorkingHours)
              : null;

    const monthlyPay =
        field === "monthlyPay"
            ? value
            : voucher.monthlyPay != null
              ? Number(voucher.monthlyPay)
              : null;
    const hourlyRate =
        field === "hourlyRate"
            ? value
            : voucher.hourlyRate != null
              ? Number(voucher.hourlyRate)
              : null;
    const restDayRate =
        field === "restDayRate"
            ? value
            : voucher.restDayRate != null
              ? Number(voucher.restDayRate)
              : null;

    type Em = Pick<
        typeof employmentTable.$inferSelect,
        | "employmentType"
        | "employmentArrangement"
        | "paymentMethod"
    >;

    const voucherValues = buildDraftPayrollVoucherValues({
        employment: {
            employmentType:
                voucher.employmentType === "Part Time"
                    ? "Part Time"
                    : "Full Time",
            employmentArrangement: (voucher.employmentArrangement ??
                "Local Worker") as Em["employmentArrangement"],
            minimumWorkingHours,
            monthlyPay,
            hourlyRate,
            restDayRate,
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
    });

    const persist = await persistDraftPayrollVoucherUpdate({
        voucherId,
        voucherValues,
        logLabel: "Error updating voucher pay rate",
        userFacingError: "Failed to update voucher pay rate",
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
