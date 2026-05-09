import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const authFile = path.join(
    process.cwd(),
    "test/playwright/.auth/operator.json",
);

setup("authenticate operator", async ({ page }) => {
    const email = process.env.USERFLOW_LOGIN_EMAIL?.trim();
    const password = process.env.USERFLOW_LOGIN_PASSWORD?.trim();

    if (!email || !password) {
        throw new Error(
            "Set USERFLOW_LOGIN_EMAIL and USERFLOW_LOGIN_PASSWORD in .env; see test/ARCHITECTURE.md.",
        );
    }

    fs.mkdirSync(path.dirname(authFile), { recursive: true });

    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

    await page.context().storageState({ path: authFile });
});
