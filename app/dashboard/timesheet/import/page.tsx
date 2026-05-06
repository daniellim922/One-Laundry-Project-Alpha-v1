import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import { TimesheetImportClient } from "./timesheet-import-client";

export default async function TimesheetImportPage() {
    const workers = await db
        .select({
            id: workerTable.id,
            name: workerTable.name,
            status: workerTable.status,
            shiftPattern: employmentTable.shiftPattern,
        })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .orderBy(workerTable.name);

    return <TimesheetImportClient workers={workers} />;
}
