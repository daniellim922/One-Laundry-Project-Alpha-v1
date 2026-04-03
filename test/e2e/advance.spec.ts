import { expect, test } from "@playwright/test";

const NOT_AUTHENTICATED_SKIP_REASON =
    "Not authenticated (auth setup did not produce a valid session). Configure DB/env and re-run e2e.";

async function requireAuthenticatedOrSkip(page: { url(): string }) {
    if (page.url().includes("/login")) {
        test.skip(true, NOT_AUTHENTICATED_SKIP_REASON);
    }
}

test.describe("Advance dashboard", () => {
    test("sidebar navigates to advance overview", async ({ page }) => {
        await page.goto("/dashboard");
        await requireAuthenticatedOrSkip(page);
        await page.getByRole("link", { name: "Advance" }).click();
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
        await requireAuthenticatedOrSkip(page);

        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);

        const actionsButton = page
            .getByRole("button", { name: "Open row actions" })
            .first();
        await expect(actionsButton).toBeVisible();
        await actionsButton.click();
        await page.getByRole("menuitem", { name: "View" }).click();

        await expect(page).toHaveURL(/\/dashboard\/advance\/[0-9a-f-]+$/i);
        await expect(page.getByTestId("advance-detail")).toBeVisible();
        await expect(page.getByTestId("advance-detail-amount")).toBeVisible();
    });

    test("add advance request form submits and returns to list", async ({
        page,
    }) => {
        await page.goto("/dashboard/advance/all");
        await requireAuthenticatedOrSkip(page);
        await page
            .getByRole("main")
            .getByRole("link", { name: "New advance" })
            .click();
        await expect(page).toHaveURL(/\/dashboard\/advance\/new$/);
        await expect(page.getByTestId("advance-request-form")).toBeVisible();

        await page.getByTestId("advance-request-worker").click();
        await page
            .getByRole("option", { name: "Nguyen Thi Thao" })
            .click();

        const future = new Date();
        future.setDate(future.getDate() + 30);
        const y = future.getFullYear();
        const m = String(future.getMonth() + 1).padStart(2, "0");
        const d = String(future.getDate()).padStart(2, "0");
        const repaymentIso = `${y}-${m}-${d}`;

        await page.getByLabel("Amount requested").fill("777");
        await page.getByLabel("Installment amount").first().fill("777");
        await page.getByLabel("Expected repayment date").first().fill(repaymentIso);

        await page.getByTestId("advance-request-submit").click();

        await expect(page).toHaveURL(/\/dashboard\/advance\/all$/);
        await expect(page.getByRole("cell", { name: "$777" }).first()).toBeVisible();
        await expect(
            page.getByRole("cell", { name: "Nguyen Thi Thao" }).first(),
        ).toBeVisible();
    });
});
