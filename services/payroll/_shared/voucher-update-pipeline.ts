import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { buildDraftPayrollVoucherValues } from "@/services/payroll/draft-payroll-voucher-values";
import type { WorkerEmploymentType } from "@/types/status";

export type VoucherMutationResult =
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

export function validatePayrollAndVoucherIds(
    payrollId: string | undefined | null,
    voucherId: string | undefined | null,
):
    | { ok: true; payrollId: string; voucherId: string }
    | { ok: false; result: Extract<VoucherMutationResult, { success: false }> } {
    if (!voucherId || !payrollId) {
        return {
            ok: false,
            result: {
                success: false,
                code: "VALIDATION_ERROR",
                error: "Missing voucherId or payrollId",
            },
        };
    }
    return { ok: true, payrollId, voucherId };
}

export function normalizeEmploymentTypeForVoucher(raw: string | null): WorkerEmploymentType {
    return raw === "Part Time" ? "Part Time" : "Full Time";
}

export type VoucherMutationGuardFailure = {
    success: false;
    code: "NOT_FOUND" | "CONFLICT";
    error: string;
};

export async function assertDraftPayrollVoucher(
    payrollId: string,
    voucherId: string,
    notDraftMessage: string,
): Promise<{ ok: true } | { ok: false; result: VoucherMutationGuardFailure }> {
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
            ok: false,
            result: {
                success: false,
                code: "NOT_FOUND",
                error: "Payroll not found",
            },
        };
    }
    if (payrollRow.payrollVoucherId !== voucherId) {
        return {
            ok: false,
            result: {
                success: false,
                code: "CONFLICT",
                error: "Voucher does not belong to this payroll",
            },
        };
    }
    if (payrollRow.status !== "Draft") {
        return {
            ok: false,
            result: {
                success: false,
                code: "CONFLICT",
                error: notDraftMessage,
            },
        };
    }
    return { ok: true };
}

type DraftVoucherValues = ReturnType<typeof buildDraftPayrollVoucherValues>;

export async function persistDraftPayrollVoucherUpdate(args: {
    voucherId: string;
    voucherValues: DraftVoucherValues;
    logLabel: string;
    userFacingError: string;
}): Promise<
    | { ok: true }
    | {
          ok: false;
          result: {
              success: false;
              code: "INTERNAL_ERROR";
              error: string;
          };
      }
> {
    try {
        await db
            .update(payrollVoucherTable)
            .set({
                ...args.voucherValues,
                updatedAt: new Date(),
            })
            .where(eq(payrollVoucherTable.id, args.voucherId));
        return { ok: true };
    } catch (error) {
        console.error(args.logLabel, error);
        return {
            ok: false,
            result: {
                success: false,
                code: "INTERNAL_ERROR",
                error: args.userFacingError,
            },
        };
    }
}
