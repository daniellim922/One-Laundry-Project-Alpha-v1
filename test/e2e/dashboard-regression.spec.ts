import { expect, test } from "@playwright/test";

const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";

async function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

test.describe("Dashboard regression smoke", () => {
    test("core modules are reachable", async ({ page }) => {
        await page.goto("/dashboard/payroll");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/payroll$/);

        await page.goto("/dashboard/advance");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/advance$/);

        await page.goto("/dashboard/timesheet");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/timesheet$/);

        await page.goto("/dashboard/worker/all");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);

        await page.goto("/dashboard/iam");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/iam$/);

        await page.goto("/dashboard/expenses");
        await requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/expenses$/);
    });
});
