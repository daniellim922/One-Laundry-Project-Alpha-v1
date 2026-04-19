import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
    MARCH_2026_MONTH,
    buildMarch2026TimesheetDataset,
    buildTimesheetRowSignature,
    readWorkerUserflowHandoffForTimesheets,
    writeTimesheetUserflowHandoff,
    type TimesheetUserflowHandoff,
} from "./timesheet-userflow-helpers";
import {
    WORKER_USERFLOW_PERMUTATIONS,
    type WorkerUserflowHandoff,
} from "../workers/worker-userflow-helpers";

describe("timesheet-userflow-helpers", () => {
    it("fails clearly when the worker handoff file is missing", async () => {
        const missingPath = path.join(
            os.tmpdir(),
            `missing-worker-handoff-${Date.now()}.json`,
        );

        await expect(
            readWorkerUserflowHandoffForTimesheets(missingPath),
        ).rejects.toThrow(
            `Worker userflow handoff file is missing at ${missingPath}. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
        );
    });

    it("fails clearly when the worker handoff file is invalid", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "timesheet-userflow-invalid-"),
        );
        const handoffPath = path.join(tempDir, "worker-userflow-handoff.json");

        try {
            await writeFile(
                handoffPath,
                JSON.stringify({
                    runId: "run-1",
                    workers: [{ permutationKey: "unknown", workerId: "123" }],
                }),
                "utf8",
            );

            await expect(
                readWorkerUserflowHandoffForTimesheets(handoffPath),
            ).rejects.toThrow(/unknown permutationKey/);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("fails clearly when the worker handoff is empty", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "timesheet-userflow-empty-"),
        );
        const handoffPath = path.join(tempDir, "worker-userflow-handoff.json");

        try {
            await writeFile(
                handoffPath,
                JSON.stringify({
                    runId: "run-1",
                    workers: [],
                }),
                "utf8",
            );

            await expect(
                readWorkerUserflowHandoffForTimesheets(handoffPath),
            ).rejects.toThrow(
                `Worker userflow handoff at ${handoffPath} does not contain any created workers. Run test/userflow/workers/01-worker-new-userflow.spec.ts first.`,
            );
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("builds a deterministic March 2026 smoke dataset keyed by semantic worker permutation", () => {
        const reversedHandoff: WorkerUserflowHandoff = {
            runId: "run-123",
            workers: [...buildWorkerHandoff().workers].reverse(),
        };

        const dataset = buildMarch2026TimesheetDataset(reversedHandoff);

        expect(dataset.month).toBe(MARCH_2026_MONTH);
        expect(dataset.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );
        expect(dataset.workers.map((worker) => worker.workerName)).toEqual([
            "Worker 1 Edited",
            "Worker 2 Edited",
            "Worker 3 Edited",
            "Worker 4 Edited",
        ]);
    });

    it("generates one same-day March smoke entry per worker permutation", () => {
        const dataset = buildMarch2026TimesheetDataset(buildWorkerHandoff());

        expect(dataset.workers).toHaveLength(WORKER_USERFLOW_PERMUTATIONS.length);

        for (const worker of dataset.workers) {
            expect(worker.entries).toHaveLength(1);

            const [entry] = worker.entries;
            expect(entry.workerId).toBe(worker.workerId);
            expect(entry.workerName).toBe(worker.workerName);
            expect(entry.permutationKey).toBe(worker.permutationKey);
            expect(entry.dateIn).toMatch(/^2026-03-\d{2}$/);
            expect(entry.dateOut).toBe(entry.dateIn);
            expect(entry.timeIn < entry.timeOut).toBe(true);
            expect(entry.totalHours).toBeGreaterThan(0);
        }

        expect(
            dataset.workers.flatMap((worker) =>
                worker.entries.map((entry) => buildTimesheetRowSignature(entry)),
            ),
        ).toEqual([
            "Worker 1 Edited | 02/03/2026 | 02/03/2026 | 08:00 | 18:00 | 10.00",
            "Worker 2 Edited | 09/03/2026 | 09/03/2026 | 09:00 | 18:00 | 9.00",
            "Worker 3 Edited | 16/03/2026 | 16/03/2026 | 08:30 | 16:30 | 8.00",
            "Worker 4 Edited | 23/03/2026 | 23/03/2026 | 10:00 | 18:30 | 8.50",
        ]);
    });

    it("writes a reusable timesheet handoff artifact", async () => {
        const tempDir = await mkdtemp(
            path.join(os.tmpdir(), "timesheet-userflow-write-"),
        );
        const handoffPath = path.join(tempDir, "timesheet-userflow-handoff.json");
        const handoff: TimesheetUserflowHandoff = buildMarch2026TimesheetDataset(
            buildWorkerHandoff(),
        );

        try {
            await writeTimesheetUserflowHandoff(handoff, handoffPath);

            const written = JSON.parse(
                await readFile(handoffPath, "utf8"),
            ) as TimesheetUserflowHandoff;

            expect(written).toEqual(handoff);
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
