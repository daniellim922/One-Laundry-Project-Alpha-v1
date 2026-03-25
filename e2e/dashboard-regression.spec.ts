import { expect, test } from "@playwright/test";

test.describe("Dashboard regression smoke", () => {
    test("core modules are reachable", async ({ page }) => {
        await page.goto("/dashboard/payroll");
        await expect(page).toHaveURL(/\/dashboard\/payroll$/);

        await page.goto("/dashboard/advance");
        await expect(page).toHaveURL(/\/dashboard\/advance$/);

        await page.goto("/dashboard/timesheet");
        await expect(page).toHaveURL(/\/dashboard\/timesheet$/);

        await page.goto("/dashboard/worker/all");
        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);

        await page.goto("/dashboard/iam");
        await expect(page).toHaveURL(/\/dashboard\/iam$/);

        await page.goto("/dashboard/expenses");
        await expect(page).toHaveURL(/\/dashboard\/expenses$/);
    });
});
