import { timesheetEntryFormSchema } from "@/db/schemas/timesheet-entry";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { recordGuidedMonthlyWorkflowStepCompletion } from "@/services/payroll/guided-monthly-workflow-activity";
import { assertWorkerEligibleForTimesheet } from "@/services/worker/assert-worker-eligible-for-timesheet";
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
        .select({
            id: workerTable.id,
            name: workerTable.name,
            status: workerTable.status,
        })
        .from(workerTable);
    const nameToId = new Map(
        workerNames.map((worker) => [worker.name.toLowerCase().trim(), worker]),
    );

    const toInsert: {
        workerId: string;
        dateIn: string;
        timeIn: string;
        dateOut: string;
        timeOut: string;
        createdAt: Date;
        updatedAt: Date;
    }[] = [];
    const errors: string[] = [];

    for (const worker of data.workers) {
        const matchedWorker = nameToId.get(worker.name.toLowerCase().trim());
        if (!matchedWorker) {
            errors.push(`Unknown worker "${worker.name}"`);
            continue;
        }

        const eligibility = assertWorkerEligibleForTimesheet(
            matchedWorker,
            "import timesheet",
        );
        if ("error" in eligibility) {
            errors.push(eligibility.error);
            continue;
        }

        const workerId = matchedWorker.id;

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

            const rowParsed = timesheetEntryFormSchema.safeParse({
                workerId,
                dateIn,
                dateOut,
                timeIn,
                timeOut,
            });
            if (!rowParsed.success) {
                const msg = rowParsed.error.issues.map((i) => i.message).join("; ");
                errors.push(`Invalid row for ${worker.name} (${date.dateIn}): ${msg}`);
                continue;
            }

            toInsert.push({
                workerId,
                dateIn,
                timeIn,
                dateOut,
                timeOut,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetTable).values(toInsert);

        try {
            await recordGuidedMonthlyWorkflowStepCompletion({
                stepId: "timesheet_import",
            });
        } catch (error) {
            console.error(
                "Failed to record guided monthly workflow completion for timesheet import",
                error,
            );
        }

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
