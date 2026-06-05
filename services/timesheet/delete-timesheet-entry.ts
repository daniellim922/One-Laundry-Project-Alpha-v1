import { eq } from "drizzle-orm";

import { timesheetTable } from "@/db/tables/timesheetTable";
import { db } from "@/lib/db";
import { regeneratePayrollPdfsAfterMutation } from "@/services/pdf/regenerate-payroll-pdfs-best-effort";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";

export async function deleteTimesheetEntry(input: { id: string }) {
    const id = input.id?.trim();
    if (!id) {
        return {
            success: false as const,
            code: "VALIDATION_ERROR",
            error: "Missing id",
        };
    }

    const [entry] = await db
        .select({ workerId: timesheetTable.workerId })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    await db.delete(timesheetTable).where(eq(timesheetTable.id, id));

    if (entry) {
        const sync = await synchronizeWorkerDraftPayrolls({
            workerId: entry.workerId,
        });
        if ("error" in sync) {
            return {
                success: false as const,
                code: "SYNC_ERROR",
                error: sync.error,
            };
        }

        await regeneratePayrollPdfsAfterMutation(sync.payrollIds);
    }

    return {
        success: true as const,
    };
}
