import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { calculateHoursFromDateTimes } from "@/utils/payroll/payroll-utils";
import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

function toTimeString(val: string): string {
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
        const parts = s.split(":");
        const h = parts[0]!.padStart(2, "0");
        const m = parts[1]!.padStart(2, "0");
        const sec = parts[2] ?? "00";
        return `${h}:${m}:${sec}`;
    }
    return s;
}

/** Convert DD/MM/YYYY to YYYY-MM-DD for DB storage */
function ddMmYyyyToIso(val: string): string {
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return "";

    const [, day, month, year] = match;
    const date = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : date;
}

export async function importAttendRecordTimesheet(data: AttendRecordOutput) {
    const workerNames = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable);
    const nameToId = new Map(
        workerNames.map((worker) => [worker.name.toLowerCase().trim(), worker.id]),
    );

    const toInsert: {
        workerId: string;
        dateIn: string;
        timeIn: string;
        dateOut: string;
        timeOut: string;
        hours: number;
        createdAt: Date;
        updatedAt: Date;
    }[] = [];
    const errors: string[] = [];

    for (const worker of data.workers) {
        const workerId = nameToId.get(worker.name.toLowerCase().trim());
        if (!workerId) {
            errors.push(`Unknown worker "${worker.name}"`);
            continue;
        }

        for (const date of worker.dates) {
            const dateIn = ddMmYyyyToIso(date.dateIn);
            const dateOut = ddMmYyyyToIso(date.dateOut);
            if (!dateIn || !dateOut) {
                errors.push(`Invalid date for ${worker.name}: ${date.dateIn}`);
                continue;
            }

            const timeIn = toTimeString(date.timeIn);
            const timeOutRaw = String(date.timeOut ?? "").trim();
            const timeOut =
                !timeOutRaw || /^\s+$/.test(timeOutRaw)
                    ? "23:59:59"
                    : toTimeString(date.timeOut);

            const hours =
                typeof date.hours === "number" && date.hours >= 0
                    ? date.hours
                    : calculateHoursFromDateTimes(dateIn, timeIn, dateOut, timeOut);

            toInsert.push({
                workerId,
                dateIn,
                timeIn,
                dateOut,
                timeOut,
                hours,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetTable).values(toInsert);

        const affectedWorkerIds = [...new Set(toInsert.map((row) => row.workerId))];
        for (const workerId of affectedWorkerIds) {
            const sync = await synchronizeWorkerDraftPayrolls({ workerId });
            if ("error" in sync) {
                return {
                    imported: toInsert.length,
                    errors: [...errors, sync.error],
                };
            }
        }
    }

    return {
        imported: toInsert.length,
        errors: errors.length > 0 ? errors : undefined,
    };
}
