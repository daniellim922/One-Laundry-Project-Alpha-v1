import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { revertPayrollInTx } from "./payroll-command-shared";

export type RevertPayrollResult =
    | {
          success: true;
          payrollId: string;
      }
    | {
          success: false;
          code: "NOT_FOUND" | "INVALID_STATE" | "INTERNAL_ERROR";
          error: string;
      };

export async function revertPayroll(input: {
    payrollId: string;
}): Promise<RevertPayrollResult> {
    const [payroll] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, input.payrollId))
        .limit(1);

    if (!payroll) {
        return {
            success: false,
            code: "NOT_FOUND",
            error: "Payroll not found",
        };
    }

    if (payroll.status !== "Settled") {
        return {
            success: false,
            code: "INVALID_STATE",
            error: "Only Settled payrolls can be reverted",
        };
    }

    try {
        await db.transaction(async (tx) => {
            await revertPayrollInTx(tx, payroll, new Date());
        });
    } catch (error) {
        console.error("Error reverting payroll", error);
        return {
            success: false,
            code: "INTERNAL_ERROR",
            error: "Failed to revert payroll",
        };
    }

    return {
        success: true,
        payrollId: input.payrollId,
    };
}
