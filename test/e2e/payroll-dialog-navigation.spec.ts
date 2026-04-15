import { expect, test, type Locator, type Page } from "@playwright/test";
const NO_PAYROLL_ROW_SKIP_REASON =
    "No payroll rows available to exercise row actions. Seed payrolls and re-run e2e.";

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

    await page
        .locator('[data-slot="sidebar-container"]')
        .getByRole("link", { name: "Payroll" })
        .first()
        .click();
    await page.waitForURL(/\/dashboard\/payroll$/);
    await expect(page).toHaveURL(/\/dashboard\/payroll$/);
}

test.describe("Payroll dialog navigation", () => {
    test("Download payrolls dialog view navigation does not lock page", async ({
        page,
    }) => {
        await page.goto("/dashboard/payroll");
        await expect(page).toHaveURL(/\/dashboard\/payroll$/);

        await page.getByRole("button", { name: "Download payrolls" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("table")).toBeVisible({ timeout: 25_000 });

        const actionButton = await requireRowActionOrSkip(
            dialog.getByRole("table"),
        );
        await actionButton.click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(
            /\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i,
        );

        await assertPageStillInteractive(page);
    });

    test("Payroll all row actions still navigate correctly", async ({ page }) => {
        await page.goto("/dashboard/payroll/all");
        await expect(
            page.getByRole("heading", { name: "All payrolls" }),
        ).toBeVisible();

        const payrollTable = page.locator("main").getByRole("table");
        await expect(payrollTable).toBeVisible({ timeout: 25_000 });

        const actionButton = await requireRowActionOrSkip(payrollTable);
        await actionButton.click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(
            /\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i,
        );

        await assertPageStillInteractive(page);
    });
});
