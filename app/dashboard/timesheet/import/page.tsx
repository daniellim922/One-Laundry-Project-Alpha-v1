import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { TimesheetImportClient } from "./timesheet-import-client";

export default async function TimesheetImportPage() {
    const workers = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);

    return <TimesheetImportClient workers={workers} />;
}
