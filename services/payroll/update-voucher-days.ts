import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";

export type UpdateVoucherDaysResult =
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

export async function updateVoucherDays(input: {
    payrollId: string;
    voucherId: string;
    restDays: number;
    publicHolidays: number;
}): Promise<UpdateVoucherDaysResult> {
    const { payrollId, voucherId, restDays, publicHolidays } = input;

    if (!voucherId || !payrollId) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Missing voucherId or payrollId",
        };
    }
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

    const [payrollRow] = await db
        .select({
            status: payrollTable.status,
            payrollVoucherId: payrollTable.payrollVoucherId,
        })
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payrollRow) {
        return {
            success: false,
            code: "NOT_FOUND",
            error: "Payroll not found",
        };
    }
    if (payrollRow.payrollVoucherId !== voucherId) {
        return {
            success: false,
            code: "CONFLICT",
            error: "Voucher does not belong to this payroll",
        };
    }
    if (payrollRow.status !== "Draft") {
        return {
            success: false,
            code: "CONFLICT",
            error: "Only Draft payrolls can edit voucher days",
        };
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
            employmentType:
                voucher.employmentType === "Part Time"
                    ? "Part Time"
                    : "Full Time",
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

    try {
        await db
            .update(payrollVoucherTable)
            .set({
                ...voucherValues,
                updatedAt: new Date(),
            })
            .where(eq(payrollVoucherTable.id, voucherId));
    } catch (error) {
        console.error("Error updating voucher days", error);
        return {
            success: false,
            code: "INTERNAL_ERROR",
            error: "Failed to update voucher days",
        };
    }

    return {
        success: true,
        payrollId,
        voucherId,
    };
}
