import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../e2e/worker-test-helpers";
import {
    buildEditWorkerSeedData,
    fillWorkerEditForm,
    openWorkerEditFromAllWorkersTable,
    readWorkerUserflowHandoff,
} from "./worker-userflow-helpers";

test.describe("Worker userflow", () => {
    test("edits one created worker from the persisted handoff", async ({
        page,
    }) => {
        const handoff = await readWorkerUserflowHandoff();
        const targetWorker = handoff.workers[0];

        if (!targetWorker) {
            throw new Error(
                "Worker userflow handoff does not contain any created workers to edit.",
            );
        }

        const updatedWorker = buildEditWorkerSeedData(targetWorker.initialValues);

        await page.goto("/dashboard/worker/all");
        await assertOpenDashboardAccess(page);

        await openWorkerEditFromAllWorkersTable(page, targetWorker.initialValues.name);
        await expect(
            page.getByRole("heading", { name: "Edit worker" }),
        ).toBeVisible();

        await fillWorkerEditForm(page, updatedWorker);
        await page.getByRole("button", { name: "Save changes" }).click();

        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/, {
            timeout: 15_000,
        });

        const main = page.getByRole("main");
        await main.getByPlaceholder("Search...").fill(updatedWorker.name);
        await expect(
            main.getByRole("cell", { name: updatedWorker.name }),
        ).toBeVisible();
    });
});
