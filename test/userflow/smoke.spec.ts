import { expect, test } from "@playwright/test";

/**
 * Placeholder userflow smoke: replace or extend with flows that mirror real production usage.
 * Run against a live URL: USERFLOW_BASE_URL=https://… npm run test:userflow
 */
test.describe("Production smoke", () => {
    test("landing page responds", async ({ page }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", {
                name: "Deploy to the cloud with confidence",
            }),
        ).toBeVisible();
    });
});
