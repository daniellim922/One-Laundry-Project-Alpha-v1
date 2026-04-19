import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    USERFLOW_HANDOFF_PATH,
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
    type WorkerUserflowHandoffRecord,
    type WorkerUserflowPermutation,
} from "../workers/worker-userflow-helpers";

export const TIMESHEET_USERFLOW_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "timesheet-userflow-handoff.json",
);

export const MARCH_2026_MONTH = "2026-03" as const;

type PermutationKey = WorkerUserflowPermutation["key"];

type SmokeShiftTemplate = {
    date: string;
    timeIn: string;
    timeOut: string;
};

export type MarchTimesheetEntryPayload = {
    workerId: string;
    workerName: string;
    permutationKey: PermutationKey;
    dateIn: string;
    dateOut: string;
    timeIn: string;
    timeOut: string;
    totalHours: number;
};

export type MarchTimesheetWorkerDataset = {
    workerId: string;
    workerName: string;
    permutationKey: PermutationKey;
    entries: MarchTimesheetEntryPayload[];
};

type TimesheetRowSignatureInput = Pick<
    MarchTimesheetEntryPayload,
    "workerName" | "dateIn" | "dateOut" | "timeIn" | "timeOut" | "totalHours"
>;

export type TimesheetUserflowHandoff = {
    runId: string;
    month: typeof MARCH_2026_MONTH;
    workers: MarchTimesheetWorkerDataset[];
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const MARCH_2026_SMOKE_SHIFTS: Record<PermutationKey, SmokeShiftTemplate> = {
    "full-time-local-bank-transfer": {
        date: "2026-03-02",
        timeIn: "08:00",
        timeOut: "18:00",
    },
    "full-time-foreign-paynow": {
        date: "2026-03-09",
        timeIn: "09:00",
        timeOut: "18:00",
    },
    "part-time-foreign-cash": {
        date: "2026-03-16",
        timeIn: "08:30",
        timeOut: "16:30",
    },
    "part-time-local-paynow": {
        date: "2026-03-23",
        timeIn: "10:00",
        timeOut: "18:30",
    },
};

export async function readWorkerUserflowHandoffForTimesheets(
    handoffPath = USERFLOW_HANDOFF_PATH,
): Promise<WorkerUserflowHandoff> {
    let raw: string;

    try {
        raw = await readFile(handoffPath, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(
                `Worker userflow handoff file is missing at ${handoffPath}. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
            );
        }

        throw error;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} is not valid JSON.`,
        );
    }

    return validateWorkerUserflowHandoff(parsed, handoffPath);
}

export function buildMarch2026TimesheetDataset(
    handoff: WorkerUserflowHandoff,
): TimesheetUserflowHandoff {
    const orderedWorkers = orderWorkerHandoffRecords(handoff);

    return {
        runId: handoff.runId,
        month: MARCH_2026_MONTH,
        workers: orderedWorkers.map((worker) => buildMarch2026WorkerDataset(worker)),
    };
}

export function buildMarch2026WorkerDataset(
    worker: WorkerUserflowHandoffRecord,
): MarchTimesheetWorkerDataset {
    return {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        entries: [createMarchTimesheetEntryPayload(worker)],
    };
}

export function buildTimesheetRowSignature(
    entry: TimesheetRowSignatureInput,
): string {
    return [
        entry.workerName,
        toDisplayDate(entry.dateIn),
        toDisplayDate(entry.dateOut),
        entry.timeIn,
        entry.timeOut,
        entry.totalHours.toFixed(2),
    ].join(" | ");
}

export async function writeTimesheetUserflowHandoff(
    handoff: TimesheetUserflowHandoff,
    handoffPath = TIMESHEET_USERFLOW_HANDOFF_PATH,
): Promise<void> {
    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
}

function createMarchTimesheetEntryPayload(
    worker: WorkerUserflowHandoffRecord,
): MarchTimesheetEntryPayload {
    const smokeShift = MARCH_2026_SMOKE_SHIFTS[worker.permutationKey];

    return {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        dateIn: smokeShift.date,
        dateOut: smokeShift.date,
        timeIn: smokeShift.timeIn,
        timeOut: smokeShift.timeOut,
        totalHours: calculateShiftHours(smokeShift.date, smokeShift),
    };
}

function calculateShiftHours(date: string, shift: SmokeShiftTemplate): number {
    const start = new Date(`${date}T${shift.timeIn}:00`);
    const end = new Date(`${date}T${shift.timeOut}:00`);
    const diffMs = end.getTime() - start.getTime();

    return roundHours(diffMs / 3_600_000);
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}

function validateWorkerUserflowHandoff(
    parsed: unknown,
    handoffPath: string,
): WorkerUserflowHandoff {
    if (!isRecord(parsed)) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} must be a JSON object.`,
        );
    }

    if (typeof parsed.runId !== "string" || parsed.runId.trim().length === 0) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} is missing a valid runId.`,
        );
    }

    if (!Array.isArray(parsed.workers) || parsed.workers.length === 0) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} does not contain any created workers. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
        );
    }

    const records = parsed.workers.map((worker, index) =>
        validateWorkerHandoffRecord(worker, index, handoffPath),
    );

    return {
        runId: parsed.runId,
        workers: orderWorkerHandoffRecords({
            runId: parsed.runId,
            workers: records,
        }),
    };
}

function validateWorkerHandoffRecord(
    record: unknown,
    index: number,
    handoffPath: string,
): WorkerUserflowHandoffRecord {
    if (!isRecord(record)) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} contains a non-object worker at index ${index}.`,
        );
    }

    if (
        typeof record.permutationKey !== "string" ||
        !EXPECTED_PERMUTATION_KEYS.includes(record.permutationKey as PermutationKey)
    ) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} contains worker ${index} with unknown permutationKey "${String(record.permutationKey)}".`,
        );
    }

    if (typeof record.workerId !== "string" || record.workerId.trim().length === 0) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} contains worker ${index} without a valid workerId.`,
        );
    }

    if (!isRecord(record.initialValues)) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} contains worker ${index} without initialValues.`,
        );
    }

    if (
        typeof record.initialValues.name !== "string" ||
        record.initialValues.name.trim().length === 0
    ) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} contains worker ${index} without a valid initialValues.name.`,
        );
    }

    return record as WorkerUserflowHandoffRecord;
}

function orderWorkerHandoffRecords(
    handoff: WorkerUserflowHandoff,
): WorkerUserflowHandoffRecord[] {
    const workersByPermutation = new Map(
        handoff.workers.map((worker) => [worker.permutationKey, worker]),
    );

    return EXPECTED_PERMUTATION_KEYS.map((permutationKey) => {
        const worker = workersByPermutation.get(permutationKey);

        if (!worker) {
            throw new Error(
                `Worker userflow handoff is missing permutation ${permutationKey}.`,
            );
        }

        return worker;
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
