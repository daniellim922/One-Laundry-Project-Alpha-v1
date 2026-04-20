import { expect, test } from "@playwright/test";

import { registerUserflowResultFolderRenaming } from "../register-userflow-result-folder";
import { assertOpenDashboardAccess } from "../../e2e/worker-test-helpers";
import {
    assertWorkerSearchableAndCaptureWorkerId,
    buildCreateWorkerSeedData,
    createUserflowRunId,
    fillWorkerCreateForm,
    signInToUserflowSession,
    type WorkerUserflowHandoff,
    WORKER_USERFLOW_PERMUTATIONS,
    writeWorkerUserflowHandoff,
} from "./worker-userflow-helpers";

registerUserflowResultFolderRenaming(test);

test.describe("Worker userflow", () => {
    test("creates the worker permutation matrix and persists edit handoff", async ({
        page,
    }) => {
        const runId = createUserflowRunId();
        const createdWorkers: WorkerUserflowHandoff["workers"] = [];

        await signInToUserflowSession(page, "/dashboard/worker/new");

        for (const [index, permutation] of WORKER_USERFLOW_PERMUTATIONS.entries()) {
            const worker = buildCreateWorkerSeedData(permutation, runId, index);

            await page.goto("/dashboard/worker/new");
            await assertOpenDashboardAccess(page);

            await expect(
                page.getByRole("heading", { name: "Add New Worker" }),
            ).toBeVisible();

            await fillWorkerCreateForm(page, worker);
            await page.getByRole("button", { name: "Add New Worker" }).click();

            await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);

            const workerId = await assertWorkerSearchableAndCaptureWorkerId(
                page,
                worker.name,
            );

            createdWorkers.push({
                permutationKey: permutation.key,
                workerId,
                initialValues: worker,
            });

            await writeWorkerUserflowHandoff({
                runId,
                workers: createdWorkers,
            });
        }

        expect(createdWorkers).toHaveLength(WORKER_USERFLOW_PERMUTATIONS.length);
    });
});
