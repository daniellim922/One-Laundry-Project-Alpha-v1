import { expect, test } from "@playwright/test";

import { assertOpenDashboardAccess } from "../e2e/worker-test-helpers";

test.describe("Worker userflow", () => {
    test("creates a canonical full-time local bank-transfer worker", async ({
        page,
    }) => {
        const stamp = Date.now();
        const workerName = `Userflow Worker ${stamp}`;

        await page.goto("/dashboard/worker/new");
        await assertOpenDashboardAccess(page);

        await expect(
            page.getByRole("heading", { name: "Add New Worker" }),
        ).toBeVisible();

        await page.getByLabel("Name").fill(workerName);
        await page.getByLabel("NRIC").fill(`T${stamp}A`);
        await page
            .getByLabel("Email")
            .fill(`userflow-worker-${stamp}@example.com`);
        await page.getByLabel("Phone").fill("81112222");
        await page.getByRole("button", { name: "Full Time" }).click();
        await page.getByRole("button", { name: "Local Worker" }).click();

        await page.getByLabel("Monthly Pay").fill("2800.00");
        await page.getByLabel("Hourly Rate").fill("12.50");
        await page.getByLabel("Rest Day Rate").fill("18.75");
        await page.getByLabel("Minimum Working Hours").fill("250");
        await page.getByLabel("CPF").fill("120.55");

        await page.getByLabel("Payment Method").click();
        await page.getByRole("option", { name: "Bank Transfer" }).click();
        await page.getByLabel("Bank Account Number").fill("1234567890");

        await page.getByRole("button", { name: "Add New Worker" }).click();

        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/, {
            timeout: 15_000,
        });

        const main = page.getByRole("main");
        await main.getByPlaceholder("Search...").fill(workerName);
        await expect(main.getByRole("cell", { name: workerName })).toBeVisible();
    });
});
