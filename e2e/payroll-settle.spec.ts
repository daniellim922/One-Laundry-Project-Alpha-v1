import { expect, test } from "@playwright/test";

test.describe("Payroll settle flow", () => {
    test("settles a draft payroll from detail page", async ({ page }) => {
        await page.goto("/dashboard/payroll/all");

        const draftRow = page.getByRole("row").filter({ hasText: "draft" }).first();
        await expect(draftRow).toBeVisible();

        await draftRow.getByRole("button", { name: "Open row actions" }).click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(/\/dashboard\/payroll\/[0-9a-f-]+\/breakdown$/i);

        await page.getByRole("button", { name: "Settle" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("button", { name: "Yes, settle" }).click();

        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(page).toHaveURL(/\/dashboard\/payroll\/[0-9a-f-]+\/summary/i);
        await expect(page.getByText("settled").first()).toBeVisible();
    });
});
