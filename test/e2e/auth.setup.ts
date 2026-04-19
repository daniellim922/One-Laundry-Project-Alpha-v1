import { mkdir } from "node:fs/promises";
import path from "node:path";

import { test as setup } from "@playwright/test";

import { signInToUserflowSession } from "../userflow/workers/worker-userflow-helpers";

const authFile = path.join(process.cwd(), "test/e2e/.auth/user.json");

setup("authenticate dashboard user", async ({ page }) => {
    await mkdir(path.dirname(authFile), { recursive: true });
    await signInToUserflowSession(page, "/dashboard");
    await page.context().storageState({ path: authFile });
});
