import { expect, test } from "@playwright/test";

import {
    fillWorkerFormFields,
    gotoAllWorkers,
    openWorkerRowMenuItem,
    readWorkerMatrixE2EState,
    submitWorkerForm,
    workerTableRow,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix delete (inactive)", () => {
    test("workers.json matrix: set status inactive for each worker", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        for (const record of records) {
            await gotoAllWorkers(page);
            await openWorkerRowMenuItem(page, record.name, "Edit");

            await fillWorkerFormFields(page, { status: "Inactive" });
            await submitWorkerForm(page, "edit");
            await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

            const row = workerTableRow(page, record.name);
            await expect(row).toBeVisible();
            await expect(row).toContainText("Inactive");
        }
    });
});
