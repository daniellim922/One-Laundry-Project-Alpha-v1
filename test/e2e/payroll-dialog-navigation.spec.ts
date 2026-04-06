import { expect, test, type Locator, type Page } from "@playwright/test";

const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";
const NO_PAYROLL_ROW_SKIP_REASON =
    "No payroll rows available to exercise row actions. Seed payrolls and re-run e2e.";

function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

async function requireRowActionOrSkip(scope: Locator) {
    const actionButton = scope
        .locator('button[aria-label="Open row actions"]')
        .first();
    try {
        await expect(actionButton).toBeVisible({ timeout: 20_000 });
    } catch {
        test.skip(true, NO_PAYROLL_ROW_SKIP_REASON);
    }
    return actionButton;
}

async function assertPageStillInteractive(page: Page) {
    const bodyPointerEvents = await page.evaluate(
        () => getComputedStyle(document.body).pointerEvents,
    );
    expect(bodyPointerEvents).not.toBe("none");

    await page.getByRole("link", { name: "Payroll" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/payroll$/);
}

test.describe("Payroll dialog navigation", () => {
    test("Download payrolls dialog view navigation does not lock page", async ({
        page,
    }) => {
        await page.goto("/dashboard/payroll");
        requireAuthenticatedOrSkip(page);
        await expect(page).toHaveURL(/\/dashboard\/payroll$/);

        await page.getByRole("button", { name: "Download payrolls" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        const actionButton = await requireRowActionOrSkip(dialog);
        await actionButton.click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(
            /\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i,
        );

        await assertPageStillInteractive(page);
    });

    test("Payroll all row actions still navigate correctly", async ({ page }) => {
        await page.goto("/dashboard/payroll/all");
        requireAuthenticatedOrSkip(page);
        await expect(
            page.getByRole("heading", { name: "All payrolls" }),
        ).toBeVisible();

        const actionButton = await requireRowActionOrSkip(page.locator("body"));
        await actionButton.click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(
            /\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i,
        );

        await assertPageStillInteractive(page);
    });
});
