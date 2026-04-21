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

export const APRIL_2026_MONTH = "2026-04" as const;
export const MAY_2026_MONTH = "2026-05" as const;

export type AttendRecordImportMonth =
    | typeof APRIL_2026_MONTH
    | typeof MAY_2026_MONTH;

export const APRIL_2026_ATTEND_RECORD_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "timesheet-april-2026-attendrecord-handoff.json",
);

export const MAY_2026_ATTEND_RECORD_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "timesheet-may-2026-attendrecord-handoff.json",
);

export type AttendRecordShiftTemplate = {
    timeIn: string;
    timeOut: string;
};

export type AttendRecordEntryPayload = {
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

export type AttendRecordWorkerDataset = {
    workerId: string;
    workerName: string;
    workerAlias: string;
    aliasUserId: string;
    permutationKey: WorkerUserflowPermutation["key"];
    shiftTemplate: AttendRecordShiftTemplate;
    missingDates: string[];
    totalImportedRows: number;
    totalHours: number;
    entries: AttendRecordEntryPayload[];
};

export type AttendRecordArtifactHandoff = {
    runId: string;
    month: AttendRecordImportMonth;
    attendanceDate: {
        startDate: string;
        endDate: string;
    };
    tablingDate: string;
    workbookPath: string;
    expectedRowCount: number;
    workers: AttendRecordWorkerDataset[];
};

type PermutationKey = WorkerUserflowPermutation["key"];

type AttendRecordPermutationSpec = {
    shiftTemplate: AttendRecordShiftTemplate;
    missingDates: readonly string[];
};

type AttendRecordMonthConfig = {
    month: AttendRecordImportMonth;
    attendanceDate: {
        startDate: string;
        endDate: string;
    };
    tablingDate: string;
    allDates: string[];
    handoffPath: string;
    workbookSlug: string;
    importSpecs: Record<PermutationKey, AttendRecordPermutationSpec>;
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const ATTEND_RECORD_MONTH_CONFIGS: Record<
    AttendRecordImportMonth,
    AttendRecordMonthConfig
> = {
    [APRIL_2026_MONTH]: {
        month: APRIL_2026_MONTH,
        attendanceDate: {
            startDate: "01/04/2026",
            endDate: "30/04/2026",
        },
        tablingDate: "30/04/2026 23:59:59",
        allDates: buildMonthDates(APRIL_2026_MONTH, 30),
        handoffPath: APRIL_2026_ATTEND_RECORD_HANDOFF_PATH,
        workbookSlug: "april-2026",
        importSpecs: {
            "full-time-local-bank-transfer": {
                shiftTemplate: {
                    timeIn: "08:00",
                    timeOut: "19:00",
                },
                missingDates: [
                    "2026-04-02",
                    "2026-04-09",
                    "2026-04-16",
                    "2026-04-23",
                ],
            },
            "full-time-foreign-paynow": {
                shiftTemplate: {
                    timeIn: "09:00",
                    timeOut: "19:00",
                },
                missingDates: ["2026-04-05", "2026-04-19"],
            },
            "part-time-foreign-cash": {
                shiftTemplate: {
                    timeIn: "08:30",
                    timeOut: "19:00",
                },
                missingDates: ["2026-04-07", "2026-04-14", "2026-04-21"],
            },
            "part-time-local-paynow": {
                shiftTemplate: {
                    timeIn: "09:30",
                    timeOut: "19:00",
                },
                missingDates: ["2026-04-25"],
            },
        },
    },
    [MAY_2026_MONTH]: {
        month: MAY_2026_MONTH,
        attendanceDate: {
            startDate: "01/05/2026",
            endDate: "31/05/2026",
        },
        tablingDate: "31/05/2026 23:59:59",
        allDates: buildMonthDates(MAY_2026_MONTH, 31),
        handoffPath: MAY_2026_ATTEND_RECORD_HANDOFF_PATH,
        workbookSlug: "may-2026",
        importSpecs: {
            "full-time-local-bank-transfer": {
                shiftTemplate: {
                    timeIn: "08:00",
                    timeOut: "19:00",
                },
                missingDates: [
                    "2026-05-06",
                    "2026-05-13",
                    "2026-05-20",
                    "2026-05-27",
                ],
            },
            "full-time-foreign-paynow": {
                shiftTemplate: {
                    timeIn: "09:00",
                    timeOut: "19:00",
                },
                missingDates: ["2026-05-10", "2026-05-24"],
            },
            "part-time-foreign-cash": {
                shiftTemplate: {
                    timeIn: "08:30",
                    timeOut: "19:00",
                },
                missingDates: ["2026-05-05", "2026-05-12", "2026-05-19"],
            },
            "part-time-local-paynow": {
                shiftTemplate: {
                    timeIn: "09:30",
                    timeOut: "19:00",
                },
                missingDates: ["2026-05-16"],
            },
        },
    },
};

export function buildApril2026AttendRecordArtifact(
    handoff: WorkerUserflowHandoff,
): AttendRecordArtifactHandoff {
    return buildAttendRecordArtifact(handoff, APRIL_2026_MONTH);
}

export function buildMay2026AttendRecordArtifact(
    handoff: WorkerUserflowHandoff,
): AttendRecordArtifactHandoff {
    return buildAttendRecordArtifact(handoff, MAY_2026_MONTH);
}

export async function createApril2026AttendRecordArtifactsFromLatestWorkerHandoff(
    handoffPath?: string,
    artifactPath = APRIL_2026_ATTEND_RECORD_HANDOFF_PATH,
): Promise<AttendRecordArtifactHandoff> {
    return createAttendRecordArtifactsFromLatestWorkerHandoff(
        APRIL_2026_MONTH,
        handoffPath,
        artifactPath,
    );
}

export async function createMay2026AttendRecordArtifactsFromLatestWorkerHandoff(
    handoffPath?: string,
    artifactPath = MAY_2026_ATTEND_RECORD_HANDOFF_PATH,
): Promise<AttendRecordArtifactHandoff> {
    return createAttendRecordArtifactsFromLatestWorkerHandoff(
        MAY_2026_MONTH,
        handoffPath,
        artifactPath,
    );
}

export async function createAttendRecordArtifactsFromLatestWorkerHandoff(
    month: AttendRecordImportMonth,
    handoffPath?: string,
    artifactPath = getMonthConfig(month).handoffPath,
): Promise<AttendRecordArtifactHandoff> {
    const handoff = await readWorkerUserflowHandoffForTimesheets(handoffPath);
    const artifact = buildAttendRecordArtifact(handoff, month);

    await writeAttendRecordArtifacts(artifact, artifactPath);

    return artifact;
}

export async function writeAttendRecordArtifacts(
    artifact: AttendRecordArtifactHandoff,
    handoffPath = getMonthConfig(artifact.month).handoffPath,
): Promise<void> {
    await mkdir(path.dirname(artifact.workbookPath), { recursive: true });
    writeAttendRecordWorkbook(artifact);

    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

export async function readAttendRecordArtifact(
    handoffPath: string,
): Promise<AttendRecordArtifactHandoff> {
    const raw = await readFile(handoffPath, "utf8");

    return JSON.parse(raw) as AttendRecordArtifactHandoff;
}

export function parseGeneratedAttendRecordWorkbook(workbookPath: string) {
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

function buildAttendRecordArtifact(
    handoff: WorkerUserflowHandoff,
    month: AttendRecordImportMonth,
): AttendRecordArtifactHandoff {
    const config = getMonthConfig(month);
    const orderedWorkers = orderWorkerHandoffRecords(handoff);
    const workbookPath = buildWorkbookPath(config.workbookSlug, handoff.runId);
    const workers = orderedWorkers.map((worker, index) =>
        buildAttendRecordWorkerDataset(worker, index, handoff.runId, config),
    );

    return {
        runId: handoff.runId,
        month: config.month,
        attendanceDate: config.attendanceDate,
        tablingDate: config.tablingDate,
        workbookPath,
        expectedRowCount: workers.reduce(
            (sum, worker) => sum + worker.totalImportedRows,
            0,
        ),
        workers,
    };
}

function buildAttendRecordWorkerDataset(
    worker: WorkerUserflowHandoffRecord,
    index: number,
    runId: string,
    config: AttendRecordMonthConfig,
): AttendRecordWorkerDataset {
    const spec = config.importSpecs[worker.permutationKey];
    const workerAlias = buildWorkerAlias(worker.initialValues.name, index);
    const aliasUserId = buildAliasUserId(runId, index);
    const entries = config.allDates
        .filter((date) => !spec.missingDates.includes(date))
        .map((date) =>
            buildAttendRecordEntry(
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

function buildAttendRecordEntry(
    worker: WorkerUserflowHandoffRecord,
    workerAlias: string,
    aliasUserId: string,
    date: string,
    shiftTemplate: AttendRecordShiftTemplate,
): AttendRecordEntryPayload {
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

function writeAttendRecordWorkbook(artifact: AttendRecordArtifactHandoff): void {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(buildAttendRecordRows(artifact));

    XLSX.utils.book_append_sheet(workbook, worksheet, "RecordTable");
    XLSX.writeFile(workbook, artifact.workbookPath, { bookType: "xls" });
}

function buildAttendRecordRows(
    artifact: AttendRecordArtifactHandoff,
): (string | number)[][] {
    const config = getMonthConfig(artifact.month);
    const rows: (string | number)[][] = [
        [
            `Attendance date:${artifact.attendanceDate.startDate} ~${artifact.attendanceDate.endDate}`,
        ],
        [`Tabling date:${artifact.tablingDate}`],
    ];

    for (const worker of artifact.workers) {
        rows.push(["UserID:", "", worker.aliasUserId, "Name:", worker.workerAlias]);
        rows.push(["", "", "", "", "", ...buildDayHeaders(config.allDates.length)]);
        rows.push([
            "",
            "",
            "",
            "",
            "",
            ...buildWorkbookDayCells(worker, config.allDates),
        ]);
        rows.push([]);
    }

    return rows;
}

function buildWorkbookDayCells(
    worker: AttendRecordWorkerDataset,
    allDates: string[],
): string[] {
    const entryByDate = new Map(
        worker.entries.map((entry) => [
            entry.dateIn,
            `${entry.timeIn}\n${entry.timeOut}`,
        ]),
    );

    return allDates.map((date) => entryByDate.get(date) ?? "");
}

function buildDayHeaders(totalDays: number): number[] {
    return Array.from({ length: totalDays }, (_, index) => index + 1);
}

function buildWorkerAlias(workerName: string, index: number): string {
    const normalizedName = workerName.replace(/\s+Edited$/, "");

    return `AttendRecord ${index + 1} ${normalizedName}`;
}

function buildAliasUserId(runId: string, index: number): string {
    const runSuffix = runId.replace(/\W+/g, "").slice(-8).toUpperCase();

    return `ATT-${runSuffix}-${String(index + 1).padStart(2, "0")}`;
}

function buildWorkbookPath(workbookSlug: string, runId: string): string {
    return path.join(
        USERFLOW_PERSISTED_ARTIFACTS_DIR,
        `timesheet-${workbookSlug}-attendrecord-${sanitizeRunId(runId)}.xls`,
    );
}

function sanitizeRunId(runId: string): string {
    return runId.replace(/[^a-zA-Z0-9-_]/g, "-");
}

function calculateShiftHours(
    date: string,
    shiftTemplate: AttendRecordShiftTemplate,
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

function getMonthConfig(month: AttendRecordImportMonth): AttendRecordMonthConfig {
    return ATTEND_RECORD_MONTH_CONFIGS[month];
}

function buildMonthDates(month: AttendRecordImportMonth, totalDays: number): string[] {
    return Array.from({ length: totalDays }, (_, index) =>
        `${month}-${String(index + 1).padStart(2, "0")}`,
    );
}
