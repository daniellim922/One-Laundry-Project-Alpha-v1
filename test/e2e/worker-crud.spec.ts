import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "./worker-test-helpers";

test.describe("Worker CRUD", () => {
    test.describe.serial("same worker lifecycle", () => {
        const stamp = Date.now();
        const workerName = `E2E Created Worker ${stamp}`;
        const workerNric = `T${stamp}A`;
        const initialPhone = "81110000";
        const updatedPhone = "82220000";
        let workerId = "";

        test("creates a worker and captures workerId from view route", async ({
            page,
        }) => {
            await page.goto("/dashboard/worker/new");
            await assertOpenDashboardAccess(page);

            await expect(
                page.getByRole("heading", { name: "Add New Worker" }),
            ).toBeVisible();

            await page.getByLabel("Name").fill(workerName);
            await page.getByLabel("NRIC").fill(workerNric);
            await page
                .getByLabel("Email")
                .fill(`worker-${stamp}@example.com`);
            await page.getByLabel("Phone").fill(initialPhone);
            await page.getByRole("button", { name: "Part Time" }).click();
            await page.getByLabel("Hourly Rate").fill("12");

            await page.getByRole("button", { name: "Add New Worker" }).click();

            await expect(page).toHaveURL(/\/dashboard\/worker\/all$/, {
                timeout: 15_000,
            });

            const main = page.getByRole("main");
            await main.getByPlaceholder("Search...").fill(workerName);
            await expect(main.getByRole("cell", { name: workerName })).toBeVisible();

            await main
                .getByRole("button", { name: "Open row actions" })
                .first()
                .click();
            await page.getByRole("menuitem", { name: "View" }).click();

            await expect(page).toHaveURL(
                /\/dashboard\/worker\/([0-9a-f-]+)\/view$/i,
            );
            const match = page.url().match(/\/dashboard\/worker\/([0-9a-f-]+)\/view$/i);
            workerId = match?.[1] ?? "";
            expect(workerId).not.toBe("");
        });

        test("opens view page for the same workerId and confirms initial values", async ({
            page,
        }) => {
            expect(workerId).not.toBe("");

            await page.goto(`/dashboard/worker/${workerId}/view`);
            await assertOpenDashboardAccess(page);

            await expect(page).toHaveURL(
                new RegExp(`/dashboard/worker/${workerId}/view$`, "i"),
            );
            await expect(
                page.getByRole("heading", { name: "View worker" }),
            ).toBeVisible();
            await expect(page.getByLabel("Name")).toHaveValue(workerName);
            await expect(page.getByLabel("Phone")).toHaveValue(initialPhone);
        });

        test("edits the same workerId and confirms updated values in view", async ({
            page,
        }) => {
            expect(workerId).not.toBe("");

            await page.goto(`/dashboard/worker/${workerId}/edit`);
            await assertOpenDashboardAccess(page);

            await expect(
                page.getByRole("heading", { name: "Edit worker" }),
            ).toBeVisible();
            await page.getByLabel("Phone").fill(updatedPhone);
            await page.getByRole("button", { name: "Save changes" }).click();

            await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);
            await page.goto(`/dashboard/worker/${workerId}/view`);
            await expect(page).toHaveURL(
                new RegExp(`/dashboard/worker/${workerId}/view$`, "i"),
            );
            await expect(page.getByLabel("Phone")).toHaveValue(updatedPhone);
        });
    });
});
