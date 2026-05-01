import { and, eq, or } from "drizzle-orm";

import { timesheetEntryFormSchema } from "@/db/schemas/timesheet-entry";
import { db } from "@/lib/db";
import { workerTable } from "@/db/tables/workerTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import { recordGuidedMonthlyWorkflowStepCompletion } from "@/services/payroll/guided-monthly-workflow-activity";
import { assertWorkerEligibleForTimesheet } from "@/services/worker/assert-worker-eligible-for-timesheet";
import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

export type ImportAttendRecordMode = "skip" | "force";

export type OverlapEntry = {
    workerName: string;
    dateIn: string;
    existingCount: number;
};

export type ImportAttendRecordResult =
    | {
          status: "success";
          imported: number;
          skipped: number;
          errors?: string[];
      }
    | {
          status: "confirmation_required";
          overlaps: OverlapEntry[];
      };

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

function pairsWhereClause(
    pairs: { workerId: string; dateIn: string }[],
) {
    if (pairs.length === 0) {
        return undefined;
    }
    const clauses = pairs.map((p) =>
        and(eq(timesheetTable.workerId, p.workerId), eq(timesheetTable.dateIn, p.dateIn)),
    );
    return clauses.length === 1 ? clauses[0]! : or(...clauses);
}

export async function importAttendRecordTimesheet(
    data: AttendRecordOutput,
    options?: { mode?: ImportAttendRecordMode },
): Promise<ImportAttendRecordResult> {
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

    if (toInsert.length === 0) {
        return {
            status: "success",
            imported: 0,
            skipped: 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    const pairKey = (workerId: string, dateIn: string) => `${workerId}|${dateIn}`;
    const uniquePairsMap = new Map<string, { workerId: string; dateIn: string }>();
    for (const row of toInsert) {
        const key = pairKey(row.workerId, row.dateIn);
        if (!uniquePairsMap.has(key)) {
            uniquePairsMap.set(key, { workerId: row.workerId, dateIn: row.dateIn });
        }
    }
    const uniquePairs = [...uniquePairsMap.values()];

    const pairsClause = pairsWhereClause(uniquePairs);
    const existing = pairsClause
        ? await db
              .select({
                  workerId: timesheetTable.workerId,
                  dateIn: timesheetTable.dateIn,
                  timeIn: timesheetTable.timeIn,
              })
              .from(timesheetTable)
              .where(pairsClause)
        : [];

    if (existing.length > 0 && options?.mode == null) {
        const counts = new Map<string, number>();
        for (const row of existing) {
            const key = pairKey(row.workerId, String(row.dateIn));
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const overlaps: OverlapEntry[] = [];
        for (const [key, existingCount] of counts) {
            const [workerId, dateIn] = key.split("|");
            const worker = workerNames.find((w) => w.id === workerId);
            overlaps.push({
                workerName: worker?.name ?? workerId,
                dateIn,
                existingCount,
            });
        }
        overlaps.sort((a, b) => {
            const byName = a.workerName.localeCompare(b.workerName);
            if (byName !== 0) return byName;
            return a.dateIn.localeCompare(b.dateIn);
        });
        return {
            status: "confirmation_required",
            overlaps,
        };
    }

    const overlappingPairKeys = new Set(
        existing.map((row) => pairKey(row.workerId, String(row.dateIn))),
    );
    const rowsToInsert =
        options?.mode === "skip"
            ? toInsert.filter((row) => !overlappingPairKeys.has(pairKey(row.workerId, row.dateIn)))
            : toInsert;

    const pairFilteredSkipped = toInsert.length - rowsToInsert.length;

    if (rowsToInsert.length === 0) {
        return {
            status: "success",
            imported: 0,
            skipped: pairFilteredSkipped,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    const insertedRows = await db
        .insert(timesheetTable)
        .values(rowsToInsert)
        .onConflictDoNothing({
            target: [
                timesheetTable.workerId,
                timesheetTable.dateIn,
                timesheetTable.timeIn,
            ],
        })
        .returning({
            id: timesheetTable.id,
            workerId: timesheetTable.workerId,
        });

    const imported = insertedRows.length;
    const dbLevelSkipped = rowsToInsert.length - imported;
    const skipped = pairFilteredSkipped + dbLevelSkipped;

    if (imported > 0) {
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

        const affectedWorkerIds = [
            ...new Set(insertedRows.map((row) => row.workerId)),
        ];
        for (const workerId of affectedWorkerIds) {
            const sync = await synchronizeWorkerDraftPayrolls({ workerId });
            if ("error" in sync) {
                return {
                    status: "success",
                    imported,
                    skipped,
                    errors: [...errors, sync.error],
                };
            }
        }
    }

    return {
        status: "success",
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
    };
}
