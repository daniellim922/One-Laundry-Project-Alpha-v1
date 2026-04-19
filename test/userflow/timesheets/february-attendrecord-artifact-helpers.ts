import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import { parseAttendRecord } from "@/utils/payroll/parse-attendrecord";

import {
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
    type WorkerUserflowHandoffRecord,
    type WorkerUserflowPermutation,
} from "../workers/worker-userflow-helpers";
import {
    buildTimesheetRowSignature,
    readWorkerUserflowHandoffForTimesheets,
} from "./timesheet-userflow-helpers";

export const FEBRUARY_2026_MONTH = "2026-02" as const;

export const FEBRUARY_2026_ATTEND_RECORD_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "timesheet-february-2026-attendrecord-handoff.json",
);

export type FebruaryAttendRecordShiftTemplate = {
    timeIn: string;
    timeOut: string;
};

export type FebruaryAttendRecordEntryPayload = {
    workerId: string;
    workerName: string;
    workerAlias: string;
    aliasUserId: string;
    permutationKey: WorkerUserflowPermutation["key"];
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    totalHours: number;
    rowSignature: string;
};

export type FebruaryAttendRecordWorkerDataset = {
    workerId: string;
    workerName: string;
    workerAlias: string;
    aliasUserId: string;
    permutationKey: WorkerUserflowPermutation["key"];
    shiftTemplate: FebruaryAttendRecordShiftTemplate;
    missingDates: string[];
    totalImportedRows: number;
    totalHours: number;
    entries: FebruaryAttendRecordEntryPayload[];
};

export type FebruaryAttendRecordArtifactHandoff = {
    runId: string;
    month: typeof FEBRUARY_2026_MONTH;
    attendanceDate: {
        startDate: string;
        endDate: string;
    };
    tablingDate: string;
    workbookPath: string;
    expectedRowCount: number;
    workers: FebruaryAttendRecordWorkerDataset[];
};

type PermutationKey = WorkerUserflowPermutation["key"];

type FebruaryPermutationSpec = {
    shiftTemplate: FebruaryAttendRecordShiftTemplate;
    missingDates: readonly string[];
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const FEBRUARY_2026_ATTENDANCE_DATE = {
    startDate: "01/02/2026",
    endDate: "28/02/2026",
} as const;

const FEBRUARY_2026_TABLING_DATE = "28/02/2026 23:59:59" as const;

const FEBRUARY_2026_ALL_DATES = Array.from({ length: 28 }, (_, index) =>
    `2026-02-${String(index + 1).padStart(2, "0")}`,
);

const FEBRUARY_2026_IMPORT_SPECS: Record<PermutationKey, FebruaryPermutationSpec> = {
    "full-time-local-bank-transfer": {
        shiftTemplate: {
            timeIn: "08:00",
            timeOut: "19:00",
        },
        missingDates: [
            "2026-02-04",
            "2026-02-11",
            "2026-02-18",
            "2026-02-25",
        ],
    },
    "full-time-foreign-paynow": {
        shiftTemplate: {
            timeIn: "09:00",
            timeOut: "19:00",
        },
        missingDates: ["2026-02-08", "2026-02-22"],
    },
    "part-time-foreign-cash": {
        shiftTemplate: {
            timeIn: "08:30",
            timeOut: "19:00",
        },
        missingDates: ["2026-02-03", "2026-02-10", "2026-02-17"],
    },
    "part-time-local-paynow": {
        shiftTemplate: {
            timeIn: "09:30",
            timeOut: "19:00",
        },
        missingDates: ["2026-02-14"],
    },
};

export function buildFebruary2026AttendRecordArtifact(
    handoff: WorkerUserflowHandoff,
): FebruaryAttendRecordArtifactHandoff {
    const orderedWorkers = orderWorkerHandoffRecords(handoff);
    const workbookPath = buildWorkbookPath(handoff.runId);
    const workers = orderedWorkers.map((worker, index) =>
        buildFebruary2026WorkerDataset(worker, index, handoff.runId),
    );

    return {
        runId: handoff.runId,
        month: FEBRUARY_2026_MONTH,
        attendanceDate: FEBRUARY_2026_ATTENDANCE_DATE,
        tablingDate: FEBRUARY_2026_TABLING_DATE,
        workbookPath,
        expectedRowCount: workers.reduce(
            (sum, worker) => sum + worker.totalImportedRows,
            0,
        ),
        workers,
    };
}

export async function createFebruary2026AttendRecordArtifactsFromLatestWorkerHandoff(
    handoffPath?: string,
    artifactPath = FEBRUARY_2026_ATTEND_RECORD_HANDOFF_PATH,
): Promise<FebruaryAttendRecordArtifactHandoff> {
    const handoff = await readWorkerUserflowHandoffForTimesheets(handoffPath);
    const artifact = buildFebruary2026AttendRecordArtifact(handoff);

    await writeFebruary2026AttendRecordArtifacts(artifact, artifactPath);

    return artifact;
}

export async function writeFebruary2026AttendRecordArtifacts(
    artifact: FebruaryAttendRecordArtifactHandoff,
    handoffPath = FEBRUARY_2026_ATTEND_RECORD_HANDOFF_PATH,
): Promise<void> {
    await mkdir(path.dirname(artifact.workbookPath), { recursive: true });
    writeAttendRecordWorkbook(artifact);

    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

export async function readFebruary2026AttendRecordArtifact(
    handoffPath = FEBRUARY_2026_ATTEND_RECORD_HANDOFF_PATH,
): Promise<FebruaryAttendRecordArtifactHandoff> {
    const raw = await readFile(handoffPath, "utf8");

    return JSON.parse(raw) as FebruaryAttendRecordArtifactHandoff;
}

export function parseGeneratedAttendRecordWorkbook(
    workbookPath: string,
) {
    const workbook = XLSX.readFile(workbookPath);
    const recordTableSheet = workbook.Sheets.RecordTable;

    if (!recordTableSheet) {
        throw new Error(
            `Generated AttendRecord workbook at ${workbookPath} is missing the RecordTable sheet.`,
        );
    }

    const rows = XLSX.utils.sheet_to_json(recordTableSheet, {
        header: 1,
        blankrows: true,
        raw: false,
    }) as (string | number | null)[][];

    return parseAttendRecord(rows);
}

function buildFebruary2026WorkerDataset(
    worker: WorkerUserflowHandoffRecord,
    index: number,
    runId: string,
): FebruaryAttendRecordWorkerDataset {
    const spec = FEBRUARY_2026_IMPORT_SPECS[worker.permutationKey];
    const workerAlias = buildWorkerAlias(worker.initialValues.name, index);
    const aliasUserId = buildAliasUserId(runId, index);
    const entries = FEBRUARY_2026_ALL_DATES.filter(
        (date) => !spec.missingDates.includes(date),
    ).map((date) =>
        buildFebruaryAttendRecordEntry(
            worker,
            workerAlias,
            aliasUserId,
            date,
            spec.shiftTemplate,
        ),
    );

    return {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        workerAlias,
        aliasUserId,
        permutationKey: worker.permutationKey,
        shiftTemplate: spec.shiftTemplate,
        missingDates: [...spec.missingDates],
        totalImportedRows: entries.length,
        totalHours: roundHours(
            entries.reduce((sum, entry) => sum + entry.totalHours, 0),
        ),
        entries,
    };
}

function buildFebruaryAttendRecordEntry(
    worker: WorkerUserflowHandoffRecord,
    workerAlias: string,
    aliasUserId: string,
    date: string,
    shiftTemplate: FebruaryAttendRecordShiftTemplate,
): FebruaryAttendRecordEntryPayload {
    const entry = {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        workerAlias,
        aliasUserId,
        permutationKey: worker.permutationKey,
        dateIn: date,
        dateOut: date,
        timeIn: shiftTemplate.timeIn,
        timeOut: shiftTemplate.timeOut,
        totalHours: calculateShiftHours(date, shiftTemplate),
    };

    return {
        ...entry,
        rowSignature: buildTimesheetRowSignature(entry),
    };
}

function writeAttendRecordWorkbook(
    artifact: FebruaryAttendRecordArtifactHandoff,
): void {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(buildAttendRecordRows(artifact));

    XLSX.utils.book_append_sheet(workbook, worksheet, "RecordTable");
    XLSX.writeFile(workbook, artifact.workbookPath, { bookType: "xls" });
}

function buildAttendRecordRows(
    artifact: FebruaryAttendRecordArtifactHandoff,
): (string | number)[][] {
    const rows: (string | number)[][] = [
        [
            `Attendance date:${artifact.attendanceDate.startDate} ~${artifact.attendanceDate.endDate}`,
        ],
        [`Tabling date:${artifact.tablingDate}`],
    ];

    for (const worker of artifact.workers) {
        rows.push(["UserID:", "", worker.aliasUserId, "Name:", worker.workerAlias]);
        rows.push(["", "", "", "", "", ...buildDayHeaders()]);
        rows.push([
            "",
            "",
            "",
            "",
            "",
            ...buildWorkbookDayCells(worker),
        ]);
        rows.push([]);
    }

    return rows;
}

function buildWorkbookDayCells(
    worker: FebruaryAttendRecordWorkerDataset,
): string[] {
    const entryByDate = new Map(
        worker.entries.map((entry) => [
            entry.dateIn,
            `${entry.timeIn}\n${entry.timeOut}`,
        ]),
    );

    return FEBRUARY_2026_ALL_DATES.map((date) => entryByDate.get(date) ?? "");
}

function buildDayHeaders(): number[] {
    return Array.from({ length: 28 }, (_, index) => index + 1);
}

function buildWorkerAlias(workerName: string, index: number): string {
    const normalizedName = workerName.replace(/\s+Edited$/, "");

    return `AttendRecord ${index + 1} ${normalizedName}`;
}

function buildAliasUserId(runId: string, index: number): string {
    const runSuffix = runId.replace(/\W+/g, "").slice(-8).toUpperCase();

    return `ATT-${runSuffix}-${String(index + 1).padStart(2, "0")}`;
}

function buildWorkbookPath(runId: string): string {
    return path.join(
        USERFLOW_PERSISTED_ARTIFACTS_DIR,
        `timesheet-february-2026-attendrecord-${sanitizeRunId(runId)}.xls`,
    );
}

function sanitizeRunId(runId: string): string {
    return runId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function calculateShiftHours(
    date: string,
    shiftTemplate: FebruaryAttendRecordShiftTemplate,
): number {
    const start = new Date(`${date}T${shiftTemplate.timeIn}:00`);
    const end = new Date(`${date}T${shiftTemplate.timeOut}:00`);

    return roundHours((end.getTime() - start.getTime()) / 3_600_000);
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}

function orderWorkerHandoffRecords(
    handoff: WorkerUserflowHandoff,
): WorkerUserflowHandoffRecord[] {
    const recordsByPermutation = new Map(
        handoff.workers.map((worker) => [worker.permutationKey, worker]),
    );

    return EXPECTED_PERMUTATION_KEYS.map((permutationKey) => {
        const worker = recordsByPermutation.get(permutationKey);

        if (!worker) {
            throw new Error(
                `Worker userflow handoff is missing permutation ${permutationKey}.`,
            );
        }

        return worker;
    });
}
