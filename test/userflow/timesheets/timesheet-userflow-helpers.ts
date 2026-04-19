import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
    USERFLOW_HANDOFF_PATH,
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
    type WorkerUserflowHandoffRecord,
    type WorkerUserflowPermutation,
} from "../workers/worker-userflow-helpers";

export const TIMESHEET_USERFLOW_HANDOFF_PATH = path.join(
    process.cwd(),
    "test",
    "results-userflow",
    "timesheet-userflow-handoff.json",
);

export const MARCH_2026_MONTH = "2026-03" as const;
export const MARCH_2026_HOUR_BAND = {
    min: 255,
    max: 265,
} as const;

type PermutationKey = WorkerUserflowPermutation["key"];

type ShiftTemplate = {
    timeIn: string;
    timeOut: string;
};

type MissingDateRule = {
    missingDates: readonly string[];
    longShiftCount: number;
    longShift: ShiftTemplate;
    standardShift: ShiftTemplate;
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
    missingDates: string[];
    totalHours: number;
    entries: MarchTimesheetEntryPayload[];
};

export type TimesheetUserflowHandoff = {
    runId: string;
    month: typeof MARCH_2026_MONTH;
    workers: MarchTimesheetWorkerDataset[];
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const MARCH_2026_RULES: Record<PermutationKey, MissingDateRule> = {
    "full-time-local-bank-transfer": {
        missingDates: [
            "2026-03-03",
            "2026-03-11",
            "2026-03-19",
            "2026-03-27",
        ],
        longShiftCount: 12,
        longShift: { timeIn: "08:00", timeOut: "18:00" },
        standardShift: { timeIn: "09:00", timeOut: "18:00" },
    },
    "full-time-foreign-paynow": {
        missingDates: ["2026-03-10", "2026-03-24"],
        longShiftCount: 0,
        longShift: { timeIn: "09:00", timeOut: "18:00" },
        standardShift: { timeIn: "09:00", timeOut: "18:00" },
    },
    "part-time-foreign-cash": {
        missingDates: ["2026-03-05", "2026-03-17", "2026-03-31"],
        longShiftCount: 3,
        longShift: { timeIn: "08:00", timeOut: "18:00" },
        standardShift: { timeIn: "09:00", timeOut: "18:00" },
    },
    "part-time-local-paynow": {
        missingDates: ["2026-03-13"],
        longShiftCount: 0,
        longShift: { timeIn: "08:30", timeOut: "17:00" },
        standardShift: { timeIn: "08:30", timeOut: "17:00" },
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
    const workers = orderedWorkers.map((worker) =>
        buildMarch2026WorkerDataset(worker),
    );

    return {
        runId: handoff.runId,
        month: MARCH_2026_MONTH,
        workers,
    };
}

export function buildMarch2026WorkerDataset(
    worker: WorkerUserflowHandoffRecord,
): MarchTimesheetWorkerDataset {
    const rule = MARCH_2026_RULES[worker.permutationKey];
    const workedDates = listMarch2026Dates().filter(
        (date) => !rule.missingDates.includes(date),
    );
    const entries = workedDates.map((date, index) => {
        const shift = index < rule.longShiftCount ? rule.longShift : rule.standardShift;

        return createMarchTimesheetEntryPayload(worker, date, shift);
    });
    const totalHours = calculateMarchWorkerTotalHours(entries);

    assertMarchWorkerTotalHourBand(worker.permutationKey, totalHours);

    return {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        missingDates: [...rule.missingDates],
        totalHours,
        entries,
    };
}

export function calculateMarchWorkerTotalHours(
    entries: MarchTimesheetEntryPayload[],
): number {
    return roundHours(
        entries.reduce((sum, entry) => sum + entry.totalHours, 0),
    );
}

export function assertMarchWorkerTotalHourBand(
    permutationKey: PermutationKey,
    totalHours: number,
): void {
    if (
        totalHours < MARCH_2026_HOUR_BAND.min ||
        totalHours > MARCH_2026_HOUR_BAND.max
    ) {
        throw new Error(
            `${permutationKey} generated ${totalHours} hours for March 2026, outside the allowed ${MARCH_2026_HOUR_BAND.min}-${MARCH_2026_HOUR_BAND.max} band.`,
        );
    }
}

export async function writeTimesheetUserflowHandoff(
    handoff: TimesheetUserflowHandoff,
    handoffPath = TIMESHEET_USERFLOW_HANDOFF_PATH,
): Promise<void> {
    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
}

export function getMarch2026MissingDates(
    permutationKey: PermutationKey,
): string[] {
    return [...MARCH_2026_RULES[permutationKey].missingDates];
}

export function listMarch2026Dates(): string[] {
    return Array.from({ length: 31 }, (_, index) =>
        `2026-03-${String(index + 1).padStart(2, "0")}`,
    );
}

function createMarchTimesheetEntryPayload(
    worker: WorkerUserflowHandoffRecord,
    date: string,
    shift: ShiftTemplate,
): MarchTimesheetEntryPayload {
    return {
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        dateIn: date,
        dateOut: date,
        timeIn: shift.timeIn,
        timeOut: shift.timeOut,
        totalHours: calculateShiftHours(date, shift),
    };
}

function calculateShiftHours(date: string, shift: ShiftTemplate): number {
    const start = new Date(`${date}T${shift.timeIn}:00`);
    const end = new Date(`${date}T${shift.timeOut}:00`);
    const diffMs = end.getTime() - start.getTime();

    return roundHours(diffMs / 3_600_000);
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
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
            `Worker userflow handoff at ${handoffPath} does not contain any created workers.`,
        );
    }

    const workers = parsed.workers.map((worker, index) =>
        validateWorkerUserflowHandoffRecord(worker, index, handoffPath),
    );

    return {
        runId: parsed.runId,
        workers: orderWorkerHandoffRecords({
            runId: parsed.runId,
            workers,
        }),
    };
}

function validateWorkerUserflowHandoffRecord(
    worker: unknown,
    index: number,
    handoffPath: string,
): WorkerUserflowHandoffRecord {
    if (!isRecord(worker)) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} has a non-object worker record at index ${index}.`,
        );
    }

    if (
        typeof worker.permutationKey !== "string" ||
        !EXPECTED_PERMUTATION_KEYS.includes(worker.permutationKey as PermutationKey)
    ) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} has an unknown permutationKey at index ${index}.`,
        );
    }

    if (typeof worker.workerId !== "string" || worker.workerId.trim().length === 0) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} is missing workerId for ${worker.permutationKey}.`,
        );
    }

    if (
        !isRecord(worker.initialValues) ||
        typeof worker.initialValues.name !== "string" ||
        worker.initialValues.name.trim().length === 0
    ) {
        throw new Error(
            `Worker userflow handoff at ${handoffPath} is missing initialValues.name for ${worker.permutationKey}.`,
        );
    }

    return worker as WorkerUserflowHandoffRecord;
}

function orderWorkerHandoffRecords(
    handoff: WorkerUserflowHandoff,
): WorkerUserflowHandoffRecord[] {
    const workerByPermutation = new Map(
        handoff.workers.map((worker) => [worker.permutationKey, worker]),
    );

    if (workerByPermutation.size !== handoff.workers.length) {
        throw new Error(
            "Worker userflow handoff contains duplicate permutation keys.",
        );
    }

    return EXPECTED_PERMUTATION_KEYS.map((permutationKey) => {
        const worker = workerByPermutation.get(permutationKey);

        if (!worker) {
            throw new Error(
                `Worker userflow handoff is missing the ${permutationKey} permutation.`,
            );
        }

        return worker;
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
