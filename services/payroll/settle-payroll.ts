import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payrollTable";
import { recordGuidedMonthlyWorkflowStepCompletion } from "@/services/payroll/guided-monthly-workflow-activity";
import { settlePayrollInTx } from "./payroll-command-shared";

export type SettlePayrollResult =
    | {
          success: true;
          payrollId: string;
      }
    | {
          success: false;
          code: "NOT_FOUND" | "INVALID_STATE" | "INTERNAL_ERROR";
          error: string;
      };

export async function settlePayroll(input: {
    payrollId: string;
}): Promise<SettlePayrollResult> {
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

    if (payroll.status !== "Draft") {
        return {
            success: false,
            code: "INVALID_STATE",
            error: "Only Draft payrolls can be settled",
        };
    }

    try {
        await db.transaction(async (tx) => {
            await settlePayrollInTx(tx, payroll, new Date());
        });
    } catch (error) {
        console.error("Error settling payroll", error);
        return {
            success: false,
            code: "INTERNAL_ERROR",
            error: "Failed to settle payroll",
        };
    }

    try {
        await recordGuidedMonthlyWorkflowStepCompletion({
            stepId: "payroll_settlement",
        });
    } catch (error) {
        console.error(
            "Failed to record guided monthly workflow completion for payroll settlement",
            error,
        );
    }

    return {
        success: true,
        payrollId: input.payrollId,
    };
}
