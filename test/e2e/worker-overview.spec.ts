import { expect, test } from "@playwright/test";

import { assertAuthenticated } from "./worker-test-helpers";

test.describe("Worker overview page", () => {
    test("loads overview and can navigate to worker list", async ({ page }) => {
        await page.goto("/dashboard/worker");
        await assertAuthenticated(page);

        await expect(
            page.getByRole("heading", { name: "Worker", exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Overview of your workforce")).toBeVisible();
        await expect(page.getByText("Total workers")).toBeVisible();
        await expect(page.getByText("Status breakdown")).toBeVisible();

        await page.getByRole("link", { name: "View all workers" }).click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();
    });
});
