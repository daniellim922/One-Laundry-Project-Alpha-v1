import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
    MARCH_2026_HOUR_BAND,
    MARCH_2026_MONTH,
    buildMarch2026TimesheetDataset,
    getMarch2026MissingDates,
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

    it("builds a deterministic March 2026 dataset keyed by semantic worker permutation", () => {
        const reversedHandoff: WorkerUserflowHandoff = {
            runId: "run-123",
            workers: [...buildWorkerHandoff().workers].reverse(),
        };

        const dataset = buildMarch2026TimesheetDataset(reversedHandoff);

        expect(dataset.month).toBe(MARCH_2026_MONTH);
        expect(dataset.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );
        expect(
            dataset.workers.find(
                (worker) => worker.permutationKey === "full-time-foreign-paynow",
            )?.missingDates,
        ).toEqual(["2026-03-10", "2026-03-24"]);
        expect(
            dataset.workers.map((worker) => worker.missingDates.length),
        ).toEqual([4, 2, 3, 1]);
    });

    it("generates March-only same-day entries and keeps every worker inside the hour band", () => {
        const dataset = buildMarch2026TimesheetDataset(buildWorkerHandoff());

        for (const worker of dataset.workers) {
            expect(worker.missingDates).toEqual(
                getMarch2026MissingDates(worker.permutationKey),
            );
            expect(worker.totalHours).toBeGreaterThanOrEqual(
                MARCH_2026_HOUR_BAND.min,
            );
            expect(worker.totalHours).toBeLessThanOrEqual(
                MARCH_2026_HOUR_BAND.max,
            );

            const workedDates = worker.entries.map((entry) => entry.dateIn);
            expect(workedDates).not.toEqual(
                expect.arrayContaining(worker.missingDates),
            );

            for (const entry of worker.entries) {
                expect(entry.dateIn).toMatch(/^2026-03-\d{2}$/);
                expect(entry.dateOut).toBe(entry.dateIn);
                expect(entry.timeIn < entry.timeOut).toBe(true);
                expect(entry.totalHours).toBeGreaterThan(0);
            }
        }

        expect(dataset.workers.map((worker) => worker.totalHours)).toEqual([
            255, 261, 255, 255,
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
                name: `Worker ${index + 1}`,
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
