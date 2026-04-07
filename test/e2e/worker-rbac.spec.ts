import { expect, test } from "@playwright/test";

import { loginAs, TEST_USERS } from "./worker-test-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Worker RBAC", () => {
    test("Workers Read Only user can view list but cannot create or update", async ({
        page,
    }) => {
        await loginAs(page, TEST_USERS.workersReadOnly);

        await page.goto("/dashboard/worker/all");
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        const main = page.getByRole("main");
        await expect(
            main.getByRole("link", { name: "New worker" }),
        ).toHaveCount(0);
        await expect(
            main.getByRole("button", { name: "Mass edit working hours" }),
        ).toHaveCount(0);

        await page.goto("/dashboard/worker/new");
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto("/dashboard/worker/all");
        await page
            .getByRole("button", { name: "Open row actions" })
            .first()
            .click();
        await page.getByRole("menuitem", { name: "Edit" }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("Workers Create Only user can create but cannot update", async ({
        page,
    }) => {
        await loginAs(page, TEST_USERS.workersCreateOnly);

        await page.goto("/dashboard/worker/all");
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        const main = page.getByRole("main");
        await expect(
            main.getByRole("link", { name: "New worker" }),
        ).toBeVisible();
        await expect(
            main.getByRole("button", { name: "Mass edit working hours" }),
        ).toHaveCount(0);

        await main.getByRole("link", { name: "New worker" }).click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/new$/);

        await page.goto("/dashboard/worker/all");
        await page
            .getByRole("button", { name: "Open row actions" })
            .first()
            .click();
        await page.getByRole("menuitem", { name: "Edit" }).click();
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("Workers Update Only user can update but cannot create", async ({
        page,
    }) => {
        await loginAs(page, TEST_USERS.workersUpdateOnly);

        await page.goto("/dashboard/worker/all");
        await expect(
            page.getByRole("heading", { name: "All workers" }),
        ).toBeVisible();

        const main = page.getByRole("main");
        await expect(
            main.getByRole("link", { name: "New worker" }),
        ).toHaveCount(0);
        await expect(
            main.getByRole("button", { name: "Mass edit working hours" }),
        ).toBeVisible();

        await page.goto("/dashboard/worker/new");
        await expect(page).toHaveURL(/\/dashboard$/);

        await page.goto("/dashboard/worker/all");
        await page
            .getByRole("button", { name: "Open row actions" })
            .first()
            .click();
        await page.getByRole("menuitem", { name: "Edit" }).click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/[0-9a-f-]+\/edit$/i);
        await expect(
            page.getByRole("heading", { name: "Edit worker" }),
        ).toBeVisible();
    });
});
