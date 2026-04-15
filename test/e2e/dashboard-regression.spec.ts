import { expect, test } from "@playwright/test";

test.describe("Dashboard regression smoke", () => {
    test("landing page and open login flow still lead into the dashboard", async ({
        page,
    }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", {
                name: "Deploy to the cloud with confidence",
            }),
        ).toBeVisible();
        await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();

        await page.goto("/login");
        await expect(
            page.getByRole("heading", { name: "Log in" }),
        ).toBeVisible();
        await page.getByLabel("Username").fill("operator");
        await page.getByLabel("Password").fill("anything");
        await page.getByRole("button", { name: "Log in" }).click();

        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("dashboard is directly accessible without visiting login first", async ({
        page,
    }) => {
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("core modules are reachable", async ({ page }) => {
        await page.goto("/dashboard/payroll");
        await expect(page).toHaveURL(/\/dashboard\/payroll$/);

        await page.goto("/dashboard/advance");
        await expect(page).toHaveURL(/\/dashboard\/advance$/);

        await page.goto("/dashboard/timesheet");
        await expect(page).toHaveURL(/\/dashboard\/timesheet$/);

        await page.goto("/dashboard/worker/all");
        await expect(page).toHaveURL(/\/dashboard\/worker\/all$/);

        await page.goto("/dashboard/expenses");
        await expect(page).toHaveURL(/\/dashboard\/expenses$/);
    });

    test("iam routes are no longer accessible", async ({ page }) => {
        const response = await page.goto("/dashboard/iam");

        expect(response?.status()).toBe(404);
        await expect(page.getByText("This page could not be found.")).toBeVisible();
    });
});
