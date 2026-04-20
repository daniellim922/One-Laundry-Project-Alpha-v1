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

export const ADVANCE_USERFLOW_HANDOFF_PATH = path.join(
    USERFLOW_PERSISTED_ARTIFACTS_DIR,
    "advance-userflow-handoff.json",
);

type PermutationKey = WorkerUserflowPermutation["key"];

export type AdvanceScenarioKey =
    | "single-installment"
    | "two-installment"
    | "three-installment"
    | "chained-two-request";

export type AdvanceRequestKey =
    | "single-installment-request"
    | "two-installment-request"
    | "three-installment-request"
    | "chained-request-1"
    | "chained-request-2";

export type AdvanceInstallmentHandoff = {
    amount: number;
    repaymentDate: string;
    status: "Installment Loan";
};

export type AdvanceRequestHandoff = {
    requestKey: AdvanceRequestKey;
    workerId: string;
    workerName: string;
    permutationKey: PermutationKey;
    scenarioKey: AdvanceScenarioKey;
    requestDate: string;
    amountRequested: number;
    purpose: string;
    installmentAmounts: AdvanceInstallmentHandoff[];
    advanceRequestId: string | null;
};

export type AdvanceWorkerScenarioHandoff = {
    scenarioKey: AdvanceScenarioKey;
    workerId: string;
    workerName: string;
    permutationKey: PermutationKey;
    requests: AdvanceRequestHandoff[];
};

export type AdvanceUserflowAnchor = {
    todayDate: string;
    anchorDate: string;
};

export type AdvanceUserflowHandoff = {
    runId: string;
    anchor: AdvanceUserflowAnchor;
    scenarios: AdvanceWorkerScenarioHandoff[];
};

type AdvanceBuilderOptions = {
    todayDate?: string;
};

type InstallmentPlan = {
    dayOffset: number;
    amount: number;
};

type RequestPlan = {
    requestKey: AdvanceRequestKey;
    requestDayOffset: number;
    amountRequested: number;
    installments: InstallmentPlan[];
};

const EXPECTED_PERMUTATION_KEYS = WORKER_USERFLOW_PERMUTATIONS.map(
    (permutation) => permutation.key,
);

const ADVANCE_SCENARIO_BY_PERMUTATION: Record<PermutationKey, AdvanceScenarioKey> = {
    "full-time-local-bank-transfer": "single-installment",
    "full-time-foreign-paynow": "two-installment",
    "part-time-foreign-cash": "three-installment",
    "part-time-local-paynow": "chained-two-request",
};

const REQUEST_PLANS_BY_SCENARIO: Record<AdvanceScenarioKey, RequestPlan[]> = {
    "single-installment": [
        {
            requestKey: "single-installment-request",
            requestDayOffset: 0,
            amountRequested: 180,
            installments: [{ dayOffset: 7, amount: 180 }],
        },
    ],
    "two-installment": [
        {
            requestKey: "two-installment-request",
            requestDayOffset: 0,
            amountRequested: 320,
            installments: [
                { dayOffset: 7, amount: 160 },
                { dayOffset: 21, amount: 160 },
            ],
        },
    ],
    "three-installment": [
        {
            requestKey: "three-installment-request",
            requestDayOffset: 0,
            amountRequested: 450,
            installments: [
                { dayOffset: 7, amount: 150 },
                { dayOffset: 21, amount: 150 },
                { dayOffset: 35, amount: 150 },
            ],
        },
    ],
    "chained-two-request": [
        {
            requestKey: "chained-request-1",
            requestDayOffset: 0,
            amountRequested: 240,
            installments: [
                { dayOffset: 7, amount: 120 },
                { dayOffset: 21, amount: 120 },
            ],
        },
        {
            requestKey: "chained-request-2",
            requestDayOffset: 28,
            amountRequested: 180,
            installments: [
                { dayOffset: 35, amount: 90 },
                { dayOffset: 49, amount: 90 },
            ],
        },
    ],
};

export async function readWorkerUserflowHandoffForAdvances(
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

export function buildAdvanceUserflowHandoff(
    handoff: WorkerUserflowHandoff,
    options: AdvanceBuilderOptions = {},
): AdvanceUserflowHandoff {
    const orderedWorkers = orderWorkerHandoffRecords(handoff);
    const todayDate = normalizeIsoDate(options.todayDate ?? getLocalTodayIsoDate());
    const anchorDate = computeEarliestValidAdvanceAnchor(todayDate);

    return {
        runId: handoff.runId,
        anchor: {
            todayDate,
            anchorDate,
        },
        scenarios: orderedWorkers.map((worker) =>
            buildAdvanceWorkerScenario(worker, handoff.runId, anchorDate),
        ),
    };
}

export function computeEarliestValidAdvanceAnchor(todayDate: string): string {
    return addDaysToIsoDate(normalizeIsoDate(todayDate), 1);
}

export function buildAdvancePurposeTag(
    runId: string,
    scenarioKey: AdvanceScenarioKey,
    requestKey: AdvanceRequestKey,
): string {
    return `advance-userflow:${runId}:${scenarioKey}:${requestKey}`;
}

export async function writeAdvanceUserflowHandoff(
    handoff: AdvanceUserflowHandoff,
    handoffPath = ADVANCE_USERFLOW_HANDOFF_PATH,
): Promise<void> {
    await mkdir(path.dirname(handoffPath), { recursive: true });
    await writeFile(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
}

function buildAdvanceWorkerScenario(
    worker: WorkerUserflowHandoffRecord,
    runId: string,
    anchorDate: string,
): AdvanceWorkerScenarioHandoff {
    const scenarioKey = ADVANCE_SCENARIO_BY_PERMUTATION[worker.permutationKey];
    const requestPlans = REQUEST_PLANS_BY_SCENARIO[scenarioKey];

    return {
        scenarioKey,
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        requests: requestPlans.map((plan) =>
            buildAdvanceRequestHandoff(worker, runId, scenarioKey, anchorDate, plan),
        ),
    };
}

function buildAdvanceRequestHandoff(
    worker: WorkerUserflowHandoffRecord,
    runId: string,
    scenarioKey: AdvanceScenarioKey,
    anchorDate: string,
    plan: RequestPlan,
): AdvanceRequestHandoff {
    return {
        requestKey: plan.requestKey,
        workerId: worker.workerId,
        workerName: worker.initialValues.name,
        permutationKey: worker.permutationKey,
        scenarioKey,
        requestDate: addDaysToIsoDate(anchorDate, plan.requestDayOffset),
        amountRequested: plan.amountRequested,
        purpose: buildAdvancePurposeTag(runId, scenarioKey, plan.requestKey),
        installmentAmounts: plan.installments.map((installment) => ({
            amount: installment.amount,
            repaymentDate: addDaysToIsoDate(anchorDate, installment.dayOffset),
            status: "Installment Loan",
        })),
        advanceRequestId: null,
    };
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

    return {
        permutationKey: record.permutationKey as PermutationKey,
        workerId: record.workerId,
        initialValues: record.initialValues,
    } as WorkerUserflowHandoffRecord;
}

function orderWorkerHandoffRecords(
    handoff: WorkerUserflowHandoff,
): WorkerUserflowHandoffRecord[] {
    const workerByPermutation = new Map(
        handoff.workers.map((worker) => [worker.permutationKey, worker]),
    );

    return EXPECTED_PERMUTATION_KEYS.map((permutationKey) => {
        const worker = workerByPermutation.get(permutationKey);

        if (!worker) {
            throw new Error(
                `Worker userflow handoff is missing permutation ${permutationKey}.`,
            );
        }

        return worker;
    });
}

function getLocalTodayIsoDate(): string {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");
}

function normalizeIsoDate(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`Expected ISO date in YYYY-MM-DD format, received "${value}".`);
    }

    return value;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);

    return date.toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
