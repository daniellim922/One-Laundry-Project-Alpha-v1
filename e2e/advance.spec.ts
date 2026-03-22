import { expect, test } from "@playwright/test";

test.describe("Advance dashboard", () => {
    test("sidebar navigates to advance list", async ({ page }) => {
        await page.goto("/dashboard");
        await page.getByRole("link", { name: "Advance" }).click();
        await expect(page).toHaveURL(/\/dashboard\/advance$/);
        await expect(
            page.getByTestId("advance-list-heading"),
        ).toBeVisible();
    });

    test("list shows seeded advance and View opens detail", async ({
        page,
    }) => {
        await page.goto("/dashboard/advance");

        const dataRow = page
            .getByRole("row")
            .filter({ hasText: "Ding Chun Rong" })
            .filter({ hasText: "$500" })
            .first();
        await expect(dataRow).toBeVisible();
        await dataRow
            .getByRole("button", { name: "Open row actions" })
            .click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(/\/dashboard\/advance\/[0-9a-f-]+$/i);
        await expect(page.getByTestId("advance-detail")).toBeVisible();
        await expect(page.getByTestId("advance-detail-amount")).toHaveText(
            "$500",
        );
        await expect(page.getByTestId("advance-detail-status")).toHaveText(
            "loan",
        );
        await expect(
            page.getByRole("link", { name: "Ding Chun Rong" }),
        ).toBeVisible();
    });

    test("add advance request form submits and returns to list", async ({
        page,
    }) => {
        await page.goto("/dashboard/advance");
        await page.getByRole("link", { name: "Add advance request" }).click();
        await expect(page).toHaveURL(/\/dashboard\/advance\/new$/);
        await expect(page.getByTestId("advance-request-form")).toBeVisible();

        await page.getByTestId("advance-request-worker").click();
        await page
            .getByRole("option", { name: "Nguyen Thi Thao" })
            .click();

        await page.getByLabel("Amount requested").fill("777");

        await page
            .getByRole("checkbox", { name: /I have read and agree/i })
            .click();

        await page.getByTestId("advance-request-submit").click();

        await expect(page).toHaveURL(/\/dashboard\/advance$/);
        await expect(page.getByRole("cell", { name: "$777" }).first()).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "Nguyen Thi Thao" }).first(),
        ).toBeVisible();
    });
});
