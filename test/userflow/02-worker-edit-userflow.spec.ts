import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../e2e/worker-test-helpers";
import {
    assertWorkerSearchableAndCaptureWorkerId,
    buildEditWorkerSeedData,
    fillWorkerEditForm,
    openWorkerEditFromAllWorkersTable,
    readWorkerUserflowHandoff,
    WORKER_USERFLOW_PERMUTATIONS,
} from "./worker-userflow-helpers";

test.describe("Worker userflow", () => {
    test("edits all created worker permutations from the persisted handoff", async ({
        page,
    }) => {
        const handoff = await readWorkerUserflowHandoff();

        if (handoff.workers.length === 0) {
            throw new Error(
                "Worker userflow handoff does not contain any created workers to edit.",
            );
        }

        expect(handoff.workers).toHaveLength(WORKER_USERFLOW_PERMUTATIONS.length);
        expect(handoff.workers.map((worker) => worker.permutationKey)).toEqual(
            WORKER_USERFLOW_PERMUTATIONS.map((permutation) => permutation.key),
        );

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

            await expect(page).toHaveURL(/\/dashboard\/worker\/all$/, {
                timeout: 15_000,
            });

            const workerId = await assertWorkerSearchableAndCaptureWorkerId(
                page,
                updatedWorker.name,
            );

            expect(workerId).toBe(targetWorker.workerId);

            await page.goto("/dashboard/worker/all");
            await assertOpenDashboardAccess(page);
        }
    });
});
