import { timesheetEntryFormSchema } from "@/db/schemas/timesheet-entry";
import {
    resolveTimesheetImportWorkerForImportedName,
    type TimesheetImportWorker,
} from "@/app/dashboard/timesheet/import/worker-matching";
import { transformNightShiftEntries } from "@/services/timesheet/transform-night-shift-entries";
import type { WorkerShiftPattern } from "@/types/status";
import {
    normalizeDateToDmy,
    type AttendRecordDate,
    type AttendRecordOutput,
} from "@/utils/payroll/parse-attendrecord";
import { dmySlashToIsoWire } from "@/utils/timesheet/import-preview-dates";
import {
    isTimesheetWireTimeStrict,
    toTimesheetWireTimeHms,
} from "@/utils/time/hm-time";

const PREVIEW_VALIDATION_WORKER_ID = "00000000-0000-0000-0000-000000000001";

export type TimesheetImportPreviewRow = {
    workerName: string;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
};

/** Parser / Excel cells use one column date (`dateIn === dateOut`); cross-midnight rows imply client pairing. */
export function isNightShiftParserCellLayout(
    dates: AttendRecordDate[],
): boolean {
    if (dates.length === 0) return true;
    for (const d of dates) {
        const din = normalizeDateToDmy(d.dateIn) ?? d.dateIn.trim();
        const dout = normalizeDateToDmy(d.dateOut) ?? d.dateOut.trim();
        if (din !== dout) return false;
    }
    return true;
}

export function resolveAttendRecordDatesForShift(
    dates: AttendRecordDate[],
    shiftPattern: WorkerShiftPattern,
    periodStart: string,
): AttendRecordDate[] {
    if (shiftPattern === "Night Shift") {
        return isNightShiftParserCellLayout(dates)
            ? transformNightShiftEntries(dates, periodStart)
            : dates;
    }
    return dates;
}

export function flattenForPreview(
    data: AttendRecordOutput,
    workers: TimesheetImportWorker[],
    manualMatchesByImportedName: Record<string, string>,
): TimesheetImportPreviewRow[] {
    const rows: TimesheetImportPreviewRow[] = [];
    const periodStart = data.attendanceDate.startDate ?? "";
    for (const worker of data.workers) {
        const resolved = resolveTimesheetImportWorkerForImportedName({
            importedName: worker.name,
            workers,
            manualMatchesByImportedName,
        });
        const dates = resolveAttendRecordDatesForShift(
            worker.dates,
            resolved?.shiftPattern ?? "Day Shift",
            periodStart,
        );
        for (const d of dates) {
            rows.push({
                workerName: worker.name,
                dateIn: d.dateIn,
                dateOut: d.dateOut,
                timeIn: d.timeIn,
                timeOut: d.timeOut.trim() || "",
            });
        }
    }
    return rows;
}

export function previewRowToImportWire(row: TimesheetImportPreviewRow): {
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
} | null {
    const dateIn = dmySlashToIsoWire(row.dateIn);
    const dateOut = dmySlashToIsoWire(row.dateOut);
    if (!dateIn || !dateOut) return null;

    const timeIn = toTimesheetWireTimeHms(row.timeIn);
    const timeOutRaw = String(row.timeOut ?? "").trim();
    const timeOut =
        !timeOutRaw || /^\s+$/.test(timeOutRaw)
            ? "23:59:59"
            : toTimesheetWireTimeHms(row.timeOut);

    return { dateIn, dateOut, timeIn, timeOut };
}

/** Mirrors per-row validation in `import-attend-record-timesheet` (dates, wire times, Zod schema). */
export function previewRowPassesImportValidation(
    row: TimesheetImportPreviewRow,
): boolean {
    const wire = previewRowToImportWire(row);
    if (!wire) return false;
    return timesheetEntryFormSchema.safeParse({
        workerId: PREVIEW_VALIDATION_WORKER_ID,
        ...wire,
    }).success;
}

export function isPreviewDateInvalid(dateStr: string): boolean {
    return dmySlashToIsoWire(dateStr) === "";
}

export function isPreviewTimeInInvalid(timeStr: string): boolean {
    const wire = toTimesheetWireTimeHms(timeStr);
    return !isTimesheetWireTimeStrict(wire);
}

/** Empty time-out is allowed (import defaults to end-of-day wire time). */
export function isPreviewTimeOutInvalid(timeStr: string): boolean {
    const trimmed = String(timeStr ?? "").trim();
    if (!trimmed || /^\s+$/.test(trimmed)) return false;
    const wire = toTimesheetWireTimeHms(timeStr);
    return !isTimesheetWireTimeStrict(wire);
}

export function hasRowError(row: TimesheetImportPreviewRow): boolean {
    return !previewRowPassesImportValidation(row);
}

export function groupRowsByWorker(
    rows: TimesheetImportPreviewRow[],
): {
    row: TimesheetImportPreviewRow;
    flatIndex: number;
    isFirstInGroup: boolean;
}[] {
    const groups = new Map<
        string,
        { row: TimesheetImportPreviewRow; index: number }[]
    >();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const list = groups.get(row.workerName) ?? [];
        list.push({ row, index: i });
        groups.set(row.workerName, list);
    }
    const workerOrder: string[] = [];
    for (const row of rows) {
        if (!workerOrder.includes(row.workerName)) {
            workerOrder.push(row.workerName);
        }
    }
    const result: {
        row: TimesheetImportPreviewRow;
        flatIndex: number;
        isFirstInGroup: boolean;
    }[] = [];
    for (const name of workerOrder) {
        const list = groups.get(name) ?? [];
        for (let j = 0; j < list.length; j++) {
            result.push({
                row: list[j]!.row,
                flatIndex: list[j]!.index,
                isFirstInGroup: j === 0,
            });
        }
    }
    return result;
}

export function editableRowsToAttendRecord(
    editableRows: TimesheetImportPreviewRow[],
    meta: {
        attendanceDate: AttendRecordOutput["attendanceDate"];
        tablingDate: string;
    },
    resolvedWorkerNamesByImportedName: Map<string, string>,
): AttendRecordOutput {
    const workersMap = new Map<string, TimesheetImportPreviewRow[]>();
    for (const row of editableRows) {
        const workerName =
            resolvedWorkerNamesByImportedName.get(row.workerName) ??
            row.workerName;
        const list = workersMap.get(workerName) ?? [];
        list.push(row);
        workersMap.set(workerName, list);
    }
    const workers = Array.from(workersMap.entries()).map(([name, rows]) => ({
        userId: "",
        name,
        dates: rows.map((r) => ({
            dateIn: r.dateIn,
            timeIn: r.timeIn,
            dateOut: r.dateOut,
            timeOut: r.timeOut || "     ",
        })),
    }));
    return {
        attendanceDate: meta.attendanceDate,
        tablingDate: meta.tablingDate,
        workers,
    };
}
