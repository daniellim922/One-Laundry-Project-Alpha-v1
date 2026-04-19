import "dotenv/config";

import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:3000";

const authStorageState = path.join(
    process.cwd(),
    "test/e2e/.auth/user.json",
);

export default defineConfig({
    testDir: "test/e2e",
    outputDir: "test/results",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    /** One worker avoids dev-server contention when many specs hit Next.js at once. */
    workers: 1,
    reporter: "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "setup",
            testMatch: /auth\.setup\.ts$/,
        },
        {
            name: "chromium",
            dependencies: ["setup"],
            testMatch: "**/*.spec.ts",
            testIgnore: "**/dashboard-regression.spec.ts",
            use: {
                ...devices["Desktop Chrome"],
                storageState: authStorageState,
            },
        },
        {
            name: "chromium-public",
            testMatch: "**/dashboard-regression.spec.ts",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
