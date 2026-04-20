import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    assertWorkerSearchableAndCaptureWorkerId,
    buildEditWorkerSeedData,
    fillWorkerEditForm,
    openWorkerEditFromAllWorkersTable,
    readWorkerUserflowHandoff,
    signInToUserflowSession,
    writeWorkerUserflowHandoff,
    type WorkerUserflowHandoff,
    WORKER_USERFLOW_PERMUTATIONS,
} from "./worker-userflow-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Worker userflow", () => {
    test("edits all created worker permutations from the persisted handoff", async ({
        page,
    }) => {
        const handoff = await readWorkerUserflowHandoff();
        const updatedWorkers: WorkerUserflowHandoff["workers"] = [];

        if (handoff.workers.length === 0) {
            throw new Error(
                "Worker userflow handoff does not contain any created workers to edit.",
            );
        }

        expect(handoff.workers).toHaveLength(WORKER_USERFLOW_PERMUTATIONS.length);
        expect(handoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

        await signInToUserflowSession(page, "/dashboard/worker/all");
        await page.goto("/dashboard/worker/all");
        await assertOpenDashboardAccess(page);

        for (const targetWorker of handoff.workers) {
            const updatedWorker = buildEditWorkerSeedData(targetWorker.initialValues);

            await openWorkerEditFromAllWorkersTable(
                page,
                targetWorker.initialValues.name,
            );
            await expect(
                page.getByRole("heading", { name: "Edit worker" }),
            ).toBeVisible();

            await fillWorkerEditForm(page, updatedWorker);
            await page.getByRole("button", { name: "Save changes" }).click();

            await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);

            const workerId = await assertWorkerSearchableAndCaptureWorkerId(
                page,
                updatedWorker.name,
            );

            expect(workerId).toBe(targetWorker.workerId);

            updatedWorkers.push({
                ...targetWorker,
                initialValues: updatedWorker,
            });
            await writeWorkerUserflowHandoff({
                runId: handoff.runId,
                workers: updatedWorkers,
            });

            await page.goto("/dashboard/worker/all");
            await assertOpenDashboardAccess(page);
        }
    });
});
