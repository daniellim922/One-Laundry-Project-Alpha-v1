import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";

export async function loadTimesheetEntryById(id: string) {
    const [entry] = await db
        .select({
            id: timesheetTable.id,
            workerId: timesheetTable.workerId,
            dateIn: timesheetTable.dateIn,
            dateOut: timesheetTable.dateOut,
            timeIn: timesheetTable.timeIn,
            timeOut: timesheetTable.timeOut,
            status: timesheetTable.status,
        })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    return entry ?? null;
}

export async function loadWorkersForTimesheetForm() {
    return db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable)
        .orderBy(workerTable.name);
}
