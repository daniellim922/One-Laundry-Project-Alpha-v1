import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    signInToUserflowSession,
    WORKER_USERFLOW_PERMUTATIONS,
} from "../workers/worker-userflow-helpers";
import {
    assertMarchWorkerTotalHourBand,
    buildMarch2026TimesheetDataset,
    calculateMarchWorkerTotalHours,
    readWorkerUserflowHandoffForTimesheets,
} from "./timesheet-userflow-helpers";
import { createTimesheetEntryThroughForm } from "./timesheet-userflow-playwright-helpers";

test.describe("Timesheet userflow", () => {
    test("creates the deterministic March 2026 dataset from the persisted worker handoff", async ({
        page,
    }) => {
        const workerHandoff = await readWorkerUserflowHandoffForTimesheets();

        expect(workerHandoff.workers).toHaveLength(
            WORKER_USERFLOW_PERMUTATIONS.length,
        );
        expect(workerHandoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        const dataset = buildMarch2026TimesheetDataset(workerHandoff);
        const createdEntriesByWorker = new Map<string, typeof dataset.workers[number]["entries"]>();

        await signInToUserflowSession(page, "/dashboard/timesheet/new");
        await assertOpenDashboardAccess(page);

        for (const worker of dataset.workers) {
            const createdEntries: typeof worker.entries = [];

            for (const entry of worker.entries) {
                await createTimesheetEntryThroughForm(page, entry);
                createdEntries.push(entry);
            }

            const totalHours = calculateMarchWorkerTotalHours(createdEntries);

            expect(totalHours).toBe(worker.totalHours);
            assertMarchWorkerTotalHourBand(worker.permutationKey, totalHours);

            createdEntriesByWorker.set(worker.workerId, createdEntries);
        }

        expect(createdEntriesByWorker.size).toBe(WORKER_USERFLOW_PERMUTATIONS.length);
        expect(
            Array.from(createdEntriesByWorker.values()).flat().length,
        ).toBe(dataset.workers.reduce((sum, worker) => sum + worker.entries.length, 0));
    });
});
