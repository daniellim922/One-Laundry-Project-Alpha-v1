import fs from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();

const authFile = path.join(rootDir, "test/playwright/.auth/operator.json");

/** App under test: `USERFLOW_BASE_URL` when set (no trailing slash); local fallback for unattended runs. */
function getBaseUrl(): string {
    const raw = process.env.USERFLOW_BASE_URL?.trim();
    if (!raw || raw.length === 0) {
        return "http://127.0.0.1:3000";
    }
    return raw.replace(/\/$/, "");
}

const baseURL = getBaseUrl();

fs.mkdirSync(path.dirname(authFile), { recursive: true });

export default defineConfig({
    testDir: path.join(rootDir, "test/playwright"),
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    /** Avoid cross-file races against one dev DB (`workers.json` matrix + overview search smoke). */
    workers: 1,
    reporter: "list",
    timeout: 60_000,
    outputDir: path.join(rootDir, "test/playwright/artifacts"),
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        /** Save a `.webm` for every test under `test/playwright/artifacts/` (per-test folder). */
        video: "on",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
            name: "chromium",
            testMatch: /.*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                storageState: authFile,
            },
            dependencies: ["setup"],
        },
    ],
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
