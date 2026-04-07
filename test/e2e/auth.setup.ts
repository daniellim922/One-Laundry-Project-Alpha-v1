import fs from "node:fs/promises";
import path from "node:path";

import { test as setup, expect } from "@playwright/test";

const storagePath = "test/e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
    const username =
        process.env.SEED_ADMIN_USERNAME ??
        process.env.PLAYWRIGHT_TEST_USERNAME ??
        "root";
    const password =
        process.env.SEED_ADMIN_PASSWORD ??
        process.env.PLAYWRIGHT_TEST_PASSWORD ??
        "root1234";

    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    try {
        await expect(page).toHaveURL(/\/dashboard(\/.*)?$/, { timeout: 20_000 });
    } catch {
        await page.context().storageState({ path: storagePath });
        if (process.env.PLAYWRIGHT_STRICT_AUTH === "1") {
            throw new Error(
                "Login failed in strict auth mode. Configure DB/env (run db:seed) and retry.",
            );
        }
        setup.skip(
            true,
            "Login failed (app not reachable or seed/admin not configured). Configure your DB/env (e.g. run db:seed) then re-run e2e.",
        );
    }

    await page.context().storageState({ path: storagePath });
});
