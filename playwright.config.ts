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

const chromiumUse = {
    ...devices["Desktop Chrome"],
    storageState: authFile,
};

/** Serial worker matrix chain: worker projects + matrix timesheet/advance spec files run outside generic chromium. */
const chromiumExcludedSpecsRe =
    /(?:[/\\]workers[/\\]worker-(?:create|read|delete|update)\.spec\.ts|[/\\]timesheets[/\\]timesheet-(?:create|update|delete)\.spec\.ts|[/\\]advances[/\\]advance-(?:create|read|update)\.spec\.ts)$/;

export default defineConfig({
    testDir: path.join(rootDir, "test/playwright"),
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    /** Avoid cross-file races against one dev DB (`workers/workers.json` matrix + overview search smoke). */
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
            testIgnore: chromiumExcludedSpecsRe,
            use: chromiumUse,
            dependencies: ["setup"],
        },
        {
            name: "worker-matrix-create",
            testMatch: /[/\\]workers[/\\]worker-create\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["setup", "chromium"],
        },
        {
            name: "worker-matrix-read",
            testMatch: /[/\\]workers[/\\]worker-read\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["worker-matrix-create"],
        },
        {
            name: "worker-matrix-delete",
            testMatch: /[/\\]workers[/\\]worker-delete\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["worker-matrix-read"],
        },
        {
            name: "worker-matrix-update",
            testMatch: /[/\\]workers[/\\]worker-update\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["worker-matrix-delete"],
        },
        {
            name: "matrix-timesheet-create",
            testMatch: /[/\\]timesheets[/\\]timesheet-create\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["worker-matrix-update"],
        },
        {
            name: "matrix-timesheet-update",
            testMatch: /[/\\]timesheets[/\\]timesheet-update\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["matrix-timesheet-create"],
        },
        {
            name: "matrix-timesheet-delete",
            testMatch: /[/\\]timesheets[/\\]timesheet-delete\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["matrix-timesheet-update"],
        },
        {
            name: "matrix-advance-create",
            testMatch: /[/\\]advances[/\\]advance-create\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["matrix-timesheet-delete"],
        },
        {
            name: "matrix-advance-read",
            testMatch: /[/\\]advances[/\\]advance-read\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["matrix-advance-create"],
        },
        {
            name: "matrix-advance-update",
            testMatch: /[/\\]advances[/\\]advance-update\.spec\.ts$/,
            use: chromiumUse,
            dependencies: ["matrix-advance-read"],
        },
    ],
    webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
