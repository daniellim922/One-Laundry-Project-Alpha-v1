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

export const PAYROLL_USERFLOW_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "payroll-userflow-handoff.json",
);

export const FEBRUARY_2026_PAYROLL_MONTH = "2026-02" as const;

type PermutationKey = WorkerUserflowPermutation["key"];

export type PayrollMonthPeriod = {
    label: string;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
};

export type PayrollUserflowWorkerMonth = {
    payrollId: string;
    status: "Draft";
};

export type PayrollUserflowWorker = {
    workerId: string;
    workerName: string;
    permutationKey: PermutationKey;
    payrollByMonth: Record<string, PayrollUserflowWorkerMonth>;
};

export type PayrollUserflowHandoff = {
    runId: string;
    periodsByMonth: Record<string, PayrollMonthPeriod>;
    workers: PayrollUserflowWorker[];
};

export type PayrollMonthExecutionPlan = {
    runId: string;
    monthKey: string;
    period: PayrollMonthPeriod;
    workerRows: Array<{
        workerId: string;
        workerName: string;
        permutationKey: PermutationKey;
    }>;
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const FEBRUARY_2026_PAYROLL_PERIOD: PayrollMonthPeriod = {
    label: "February 2026 payroll",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    payrollDate: "2026-03-05",
};

export async function readWorkerUserflowHandoffForPayroll(
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

export function buildFebruary2026PayrollPlan(
    handoff: WorkerUserflowHandoff,
): PayrollMonthExecutionPlan {
    const orderedWorkers = orderWorkerHandoffRecordsStrict(handoff, "in-memory handoff");

    return {
        runId: handoff.runId,
        monthKey: FEBRUARY_2026_PAYROLL_MONTH,
        period: FEBRUARY_2026_PAYROLL_PERIOD,
        workerRows: orderedWorkers.map((worker) => ({
            workerId: worker.workerId,
            workerName: worker.initialValues.name,
            permutationKey: worker.permutationKey,
        })),
    };
}

export function initializePayrollUserflowHandoff(
    handoff: WorkerUserflowHandoff,
): PayrollUserflowHandoff {
    const orderedWorkers = orderWorkerHandoffRecordsStrict(handoff, "in-memory handoff");

    return {
        runId: handoff.runId,
        periodsByMonth: {},
        workers: orderedWorkers.map((worker) => ({
            workerId: worker.workerId,
            workerName: worker.initialValues.name,
            permutationKey: worker.permutationKey,
            payrollByMonth: {},
        })),
    };
}

export async function writePayrollUserflowHandoff(
    handoff: PayrollUserflowHandoff,
    handoffPath = PAYROLL_USERFLOW_HANDOFF_PATH,
): Promise<void> {
    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
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
        workers: orderWorkerHandoffRecordsStrict(
            {
                runId: parsed.runId,
                workers: records,
            },
            handoffPath,
        ),
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

function orderWorkerHandoffRecordsStrict(
    handoff: WorkerUserflowHandoff,
    source: string,
): WorkerUserflowHandoffRecord[] {
    const workersByPermutation = new Map<PermutationKey, WorkerUserflowHandoffRecord>();

    for (const worker of handoff.workers) {
        if (workersByPermutation.has(worker.permutationKey)) {
            throw new Error(
                `Worker userflow handoff at ${source} contains duplicate permutationKey ${worker.permutationKey}.`,
            );
        }

        workersByPermutation.set(worker.permutationKey, worker);
    }

    const ordered: WorkerUserflowHandoffRecord[] = [];

    for (const permutationKey of EXPECTED_PERMUTATION_KEYS) {
        const worker = workersByPermutation.get(permutationKey);

        if (!worker) {
            throw new Error(
                `Worker userflow handoff at ${source} is missing permutation ${permutationKey}.`,
            );
        }

        ordered.push(worker);
    }

    return ordered;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
