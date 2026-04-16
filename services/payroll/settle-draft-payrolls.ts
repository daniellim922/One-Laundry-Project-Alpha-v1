import { inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { settlePayrollInTx } from "./payroll-command-shared";

export type SettleDraftPayrollsResult =
    | {
          success: true;
          settled: number;
          settledPayrollIds: string[];
      }
    | {
          success: false;
          code:
              | "VALIDATION_ERROR"
              | "NOT_FOUND"
              | "INVALID_STATE"
              | "INTERNAL_ERROR";
          error: string;
      };

class SettleDraftPayrollsValidationError extends Error {
    readonly code: "NOT_FOUND" | "INVALID_STATE";

    constructor(code: "NOT_FOUND" | "INVALID_STATE") {
        super(code);
        this.code = code;
        this.name = "SettleDraftPayrollsValidationError";
    }
}

export async function settleDraftPayrolls(input: {
    payrollIds: string[];
}): Promise<SettleDraftPayrollsResult> {
    const uniqueIds = Array.from(new Set(input.payrollIds));
    if (uniqueIds.length === 0) {
        return {
            success: false,
            code: "VALIDATION_ERROR",
            error: "Select at least one payroll to settle",
        };
    }

    try {
        const settledPayrollIds = await db.transaction(async (tx) => {
            const rows = await tx
                .select()
                .from(payrollTable)
                .where(inArray(payrollTable.id, uniqueIds));

            if (rows.length !== uniqueIds.length) {
                throw new SettleDraftPayrollsValidationError("NOT_FOUND");
            }

            if (rows.some((row) => row.status !== "Draft")) {
                throw new SettleDraftPayrollsValidationError("INVALID_STATE");
            }

            const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
            const now = new Date();
            for (const payroll of sorted) {
                await settlePayrollInTx(tx, payroll, now);
            }

            return sorted.map((payroll) => payroll.id);
        });

        return {
            success: true,
            settled: settledPayrollIds.length,
            settledPayrollIds,
        };
    } catch (error) {
        if (error instanceof SettleDraftPayrollsValidationError) {
            return {
                success: false,
                code: error.code,
                error:
                    error.code === "NOT_FOUND"
                        ? "One or more payrolls were not found"
                        : "One or more payrolls are not drafts",
            };
        }

        console.error("Error settling Draft payrolls", error);
        return {
            success: false,
            code: "INTERNAL_ERROR",
            error: "Failed to settle Draft payrolls",
        };
    }
}
