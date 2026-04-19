import { expect, test } from "@playwright/test";

import { navigateFromOpenRowMenuView } from "./e2e-dropdown-helpers";

test.describe("Advance dashboard", () => {
    test("sidebar navigates to advance overview", async ({ page }) => {
        await page.goto("/dashboard");
        const sidebar = page.locator('[data-slot="sidebar-container"]');
        await sidebar.getByRole("link", { name: "Advance" }).click();
        await page.waitForURL(/\/dashboard\/advance$/);
        await expect(page).toHaveURL(/\/dashboard\/advance$/);
        await expect(
            page
                .locator("main")
                .getByRole("heading", { name: "Advance", exact: true }),
        ).toBeVisible();
    });

    test("list shows seeded advance and View opens detail", async ({
        page,
    }) => {
        await page.goto("/dashboard/advance/all");

        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);

        const main = page.locator("main");
        await expect(main.getByRole("table")).toBeVisible({ timeout: 25_000 });
        const actionsButton = main
            .getByRole("button", { name: "Open row actions" })
            .first();
        await expect(actionsButton).toBeVisible();
        await actionsButton.click();
        await navigateFromOpenRowMenuView(page);

        await expect(page).toHaveURL(/\/dashboard\/advance\/[0-9a-f-]+$/i);
        await expect(page.getByTestId("advance-detail")).toBeVisible();
        await expect(page.getByTestId("advance-detail-amount")).toBeVisible();
    });

    test("add advance request form submits and returns to list", async ({
        page,
    }) => {
        test.setTimeout(90_000);
        await page.goto("/dashboard/advance/new");
        await expect(page).toHaveURL(/\/dashboard\/advance\/new$/);
        await expect(page.getByTestId("advance-request-form")).toBeVisible();

        await page.getByTestId("advance-request-worker").click();
        await page
            .getByRole("option", { name: "Nguyen Thi Thao" })
            .first()
            .click();

        const future = new Date();
        future.setDate(future.getDate() + 30);
        const y = future.getFullYear();
        const m = String(future.getMonth() + 1).padStart(2, "0");
        const d = String(future.getDate()).padStart(2, "0");
        /** DatePickerInput masks DD/MM/YYYY; ISO strings digit-strip incorrectly. */
        const repaymentDmy = `${d}/${m}/${y}`;

        await page.getByLabel("Amount requested").fill("777");
        await page.getByLabel("Installment amount").first().fill("777");
        await page
            .getByLabel("Expected repayment date")
            .first()
            .fill(repaymentDmy);

        await page.getByTestId("advance-request-submit").click();

        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);
        await expect(page.getByRole("cell", { name: "$777" }).first()).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "Nguyen Thi Thao" }).first(),
        ).toBeVisible();
    });
});
