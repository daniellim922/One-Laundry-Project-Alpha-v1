import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    signInToUserflowSession,
    WORKER_USERFLOW_PERMUTATIONS,
} from "../workers/worker-userflow-helpers";
import {
    buildMarch2026TimesheetDataset,
    readWorkerUserflowHandoffForTimesheets,
    writeTimesheetUserflowHandoff,
} from "./timesheet-userflow-helpers";
import {
    cleanupExistingTimesheetDataset,
    createTimesheetEntryThroughForm,
    verifyTimesheetDatasetInAllTimesheetsUi,
} from "./timesheet-userflow-playwright-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Timesheet userflow", () => {
    test("creates the deterministic March 2026 smoke handoff from the persisted worker handoff", async ({
        page,
    }) => {
        test.setTimeout(5 * 60_000);

        const workerHandoff = await readWorkerUserflowHandoffForTimesheets();

        expect(workerHandoff.workers).toHaveLength(
            WORKER_USERFLOW_PERMUTATIONS.length,
        );
        expect(workerHandoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        const dataset = buildMarch2026TimesheetDataset(workerHandoff);
        const createdEntriesByWorker = new Map<
            string,
            (typeof dataset.workers)[number]["entries"]
        >();

        await signInToUserflowSession(page, "/dashboard/timesheet/new");
        await assertOpenDashboardAccess(page);
        await cleanupExistingTimesheetDataset(page, dataset);

        for (const worker of dataset.workers) {
            const createdEntries: typeof worker.entries = [];

            for (const entry of worker.entries) {
                await createTimesheetEntryThroughForm(page, entry);
                createdEntries.push(entry);
            }

            createdEntriesByWorker.set(worker.workerId, createdEntries);
        }

        expect(createdEntriesByWorker.size).toBe(WORKER_USERFLOW_PERMUTATIONS.length);
        expect(Array.from(createdEntriesByWorker.values()).flat()).toEqual(
            dataset.workers.flatMap((worker) => worker.entries),
        );

        await verifyTimesheetDatasetInAllTimesheetsUi(page, dataset);
        await writeTimesheetUserflowHandoff(dataset);
    });
});
