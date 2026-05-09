import { expect, test } from "@playwright/test";

import {
    applyWorkerMatrixUpdateTransforms,
    expectWorkerMatrixRowMatchesUpdatedProfile,
    fillWorkerFormFields,
    gotoAllWorkers,
    nonEmptyMoneyOrHoursField,
    openWorkerRowMenuItem,
    readWorkerMatrixE2EState,
    submitWorkerForm,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix update", () => {
    test("workers.json matrix: set active and apply edit transforms", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const { records } = readWorkerMatrixE2EState();

        for (const record of records) {
            const transforms = applyWorkerMatrixUpdateTransforms(record.profile);

            await gotoAllWorkers(page);
            await openWorkerRowMenuItem(page, record.name, "Edit");

            await page
                .getByRole("group", { name: "Status" })
                .waitFor({ state: "visible", timeout: 15_000 });
            await page
                .getByRole("group", { name: "Status" })
                .getByRole("button", { name: "Active", exact: true })
                .click();

            await fillWorkerFormFields(page, transforms);
            await submitWorkerForm(page, "edit");
            await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

            await expectWorkerMatrixRowMatchesUpdatedProfile(
                page,
                record.profile,
                transforms,
            );

            await openWorkerRowMenuItem(page, transforms.name!, "View");
            await expect(page.locator("#worker-form-name")).toHaveValue(
                transforms.name!,
            );
            await expect(page.locator("#worker-form-nric")).toHaveValue(
                transforms.nric!,
            );
            if (
                transforms.email != null &&
                String(transforms.email).trim() !== ""
            ) {
                await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
                    String(transforms.email),
                );
            }
            if (
                transforms.phone != null &&
                String(transforms.phone).trim() !== ""
            ) {
                await expect(page.getByLabel("Phone", { exact: true })).toHaveValue(
                    String(transforms.phone),
                );
            }

            const restAfter = nonEmptyMoneyOrHoursField(transforms.restDayRate);
            if (restAfter != null) {
                await expect(page.locator("#worker-form-restDayRate")).toHaveValue(
                    restAfter,
                );
            }
        }
    });
});
