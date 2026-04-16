import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { calculateHoursFromDateTimes } from "@/utils/payroll/payroll-utils";

type SaveTimesheetEntryInput = {
    workerId: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
};

export async function createTimesheetEntryRecord(
    input: SaveTimesheetEntryInput,
) {
    const workerId = input.workerId?.trim();
    const dateIn = input.dateIn?.trim();
    const dateOut = input.dateOut?.trim();
    const timeIn = input.timeIn?.trim();
    const timeOut = input.timeOut?.trim();

    if (!workerId || !dateIn || !dateOut || !timeIn || !timeOut) {
        return { error: "Missing required fields" };
    }

    const hours = calculateHoursFromDateTimes(dateIn, timeIn, dateOut, timeOut);

    await db.insert(timesheetTable).values({
        workerId,
        dateIn,
        timeIn,
        dateOut,
        timeOut,
        hours,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const sync = await synchronizeWorkerDraftPayrolls({ workerId });
    if ("error" in sync) {
        return { error: sync.error };
    }

    return { success: true as const };
}

export async function updateTimesheetEntryRecord(
    input: SaveTimesheetEntryInput & { id: string },
) {
    const id = input.id?.trim();
    const workerId = input.workerId?.trim();
    const dateIn = input.dateIn?.trim();
    const dateOut = input.dateOut?.trim();
    const timeIn = input.timeIn?.trim();
    const timeOut = input.timeOut?.trim();

    if (!id || !workerId || !dateIn || !dateOut || !timeIn || !timeOut) {
        return { error: "Missing required fields" };
    }

    const [oldEntry] = await db
        .select({
            workerId: timesheetTable.workerId,
            status: timesheetTable.status,
        })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    if (!oldEntry) {
        return { error: "Timesheet entry not found" };
    }

    if (oldEntry.status === "Timesheet Paid") {
        return { error: "Timesheet Paid entries cannot be edited" };
    }

    const hours = calculateHoursFromDateTimes(dateIn, timeIn, dateOut, timeOut);

    await db
        .update(timesheetTable)
        .set({
            workerId,
            dateIn,
            timeIn,
            dateOut,
            timeOut,
            hours,
            updatedAt: new Date(),
        })
        .where(eq(timesheetTable.id, id));

    const sync = await synchronizeWorkerDraftPayrolls({ workerId });
    if ("error" in sync) {
        return { error: sync.error };
    }

    if (oldEntry.workerId !== workerId) {
        const syncOld = await synchronizeWorkerDraftPayrolls({
            workerId: oldEntry.workerId,
        });
        if ("error" in syncOld) {
            return { error: syncOld.error };
        }
    }

    return { success: true as const };
}
