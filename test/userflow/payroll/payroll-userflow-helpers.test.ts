import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
    FEBRUARY_2026_PAYROLL_MONTH,
    buildFebruary2026PayrollPlan,
    initializePayrollUserflowHandoff,
    readWorkerUserflowHandoffForPayroll,
    writePayrollUserflowHandoff,
    type PayrollUserflowHandoff,
} from "./payroll-userflow-helpers";
import {
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
} from "../workers/worker-userflow-helpers";

describe("payroll-userflow-helpers", () => {
    it("fails clearly when the worker handoff file is missing", async () => {
        const missingPath = path.join(
            os.tmpdir(),
            `missing-payroll-worker-handoff-${Date.now()}.json`,
        );

        await expect(
            readWorkerUserflowHandoffForPayroll(missingPath),
        ).rejects.toThrow(
            `Worker userflow handoff file is missing at ${missingPath}. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
        );
    });

    it("fails clearly when a worker permutation is duplicated", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "payroll-userflow-duplicate-"),
        );
        const handoffPath = path.join(tempDir, "worker-userflow-handoff.json");
        const duplicated = buildWorkerHandoff();

        duplicated.workers[1] = {
            ...duplicated.workers[1]!,
            permutationKey: duplicated.workers[0]!.permutationKey,
        };

        try {
            await writeFile(handoffPath, JSON.stringify(duplicated), "utf8");

            await expect(
                readWorkerUserflowHandoffForPayroll(handoffPath),
            ).rejects.toThrow(/duplicate permutationKey/);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("fails clearly when an expected permutation is missing", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "payroll-userflow-missing-"),
        );
        const handoffPath = path.join(tempDir, "worker-userflow-handoff.json");
        const missingPermutation = buildWorkerHandoff();

        missingPermutation.workers.pop();

        try {
            await writeFile(handoffPath, JSON.stringify(missingPermutation), "utf8");

            await expect(
                readWorkerUserflowHandoffForPayroll(handoffPath),
            ).rejects.toThrow(/missing permutation/);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("builds a deterministic February 2026 payroll plan ordered by canonical permutations", () => {
        const reversedHandoff: WorkerUserflowHandoff = {
            runId: "run-123",
            workers: [...buildWorkerHandoff().workers].reverse(),
        };

        const plan = buildFebruary2026PayrollPlan(reversedHandoff);

        expect(plan.monthKey).toBe(FEBRUARY_2026_PAYROLL_MONTH);
        expect(plan.workerRows.map((row) => row.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );
        expect(plan.workerRows.map((row) => row.workerName)).toEqual([
            "Worker 1 Edited",
            "Worker 2 Edited",
            "Worker 3 Edited",
            "Worker 4 Edited",
        ]);
    });

    it("writes a stable payroll handoff initialized for the current run and then persists February payroll IDs", async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), "payroll-userflow-write-"));
        const handoffPath = path.join(tempDir, "payroll-userflow-handoff.json");
        const workerHandoff = buildWorkerHandoff();
        const plan = buildFebruary2026PayrollPlan(workerHandoff);

        try {
            const initial = initializePayrollUserflowHandoff(workerHandoff);

            await writePayrollUserflowHandoff(initial, handoffPath);

            const created: PayrollUserflowHandoff = {
                ...initial,
                periodsByMonth: {
                    [plan.monthKey]: plan.period,
                },
                workers: initial.workers.map((worker, index) => ({
                    ...worker,
                    payrollByMonth: {
                        [plan.monthKey]: {
                            payrollId: `payroll-${index + 1}`,
                            status: "Draft",
                        },
                    },
                })),
            };

            await writePayrollUserflowHandoff(created, handoffPath);

            const written = JSON.parse(
                await readFile(handoffPath, "utf8"),
            ) as PayrollUserflowHandoff;

            expect(written.runId).toBe(workerHandoff.runId);
            expect(Object.keys(written.periodsByMonth)).toEqual([
                FEBRUARY_2026_PAYROLL_MONTH,
            ]);
            expect(written.periodsByMonth[FEBRUARY_2026_PAYROLL_MONTH]).toEqual(
                plan.period,
            );
            expect(written.workers.map((worker) => worker.permutationKey)).toEqual(
                WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
            );
            expect(
                written.workers.every(
                    (worker) =>
                        worker.payrollByMonth[FEBRUARY_2026_PAYROLL_MONTH]?.payrollId,
                ),
            ).toBe(true);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});

function buildWorkerHandoff(): WorkerUserflowHandoff {
    return {
        runId: "run-123",
        workers: WORKER_USERFLOW_PERMUTATIONS.map((permutation, index) => ({
            permutationKey: permutation.key,
            workerId: `worker-${index + 1}`,
            initialValues: {
                name: `Worker ${index + 1} Edited`,
                nric: `T000000${index}A`,
                email: `worker-${index + 1}@example.com`,
                phone: `8000000${index}`,
                employmentType: permutation.employmentType,
                employmentArrangement: permutation.employmentArrangement,
                paymentMethod: permutation.paymentMethod,
                hourlyRate: permutation.hourlyRate,
                monthlyPay: permutation.monthlyPay ?? null,
                restDayRate: permutation.restDayRate ?? null,
                minimumWorkingHours: permutation.minimumWorkingHours ?? null,
                cpf: permutation.cpf ?? null,
                countryOfOrigin: permutation.countryOfOrigin ?? null,
                bankAccountNumber: permutation.bankAccountNumber ?? null,
                payNowPhone: permutation.payNowPhone ?? null,
            },
        })),
    };
}
