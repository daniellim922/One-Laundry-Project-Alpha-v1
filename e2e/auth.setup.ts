import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
    const username =
        process.env.SEED_ADMIN_USERNAME ??
        process.env.PLAYWRIGHT_TEST_USERNAME ??
        "root";
    const password =
        process.env.SEED_ADMIN_PASSWORD ??
        process.env.PLAYWRIGHT_TEST_PASSWORD ??
        "root1234";

    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

    await page.context().storageState({ path: "e2e/.auth/user.json" });
});
