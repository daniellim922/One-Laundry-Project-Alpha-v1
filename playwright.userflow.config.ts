import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

/**
 * Userflow tests: exercise the app as a real user against a deployed environment
 * (e.g. production or staging). Does not start `npm run dev`; set the base URL explicitly.
 *
 * Example:
 *   USERFLOW_BASE_URL=https://your-app.vercel.app npm run test:userflow
 */
const baseURL =
    process.env.USERFLOW_BASE_URL ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    "http://127.0.0.1:3000";

export default defineConfig({
    testDir: "test/userflow",
    testMatch: ["**/*.spec.ts"],
    outputDir: "test/results-userflow",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "list",
    use: {
        baseURL,
        video: "on",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "worker-new",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["workers/01-*.spec.ts"],
        },
        {
            name: "worker-edit",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["workers/**/*.spec.ts"],
            testIgnore: ["workers/01-*.spec.ts"],
            dependencies: ["worker-new"],
        },
        {
            name: "timesheet-march",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["timesheets/01-*.spec.ts"],
            dependencies: ["worker-edit"],
        },
        {
            name: "timesheet-followups",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["timesheets/**/*.spec.ts"],
            testIgnore: ["timesheets/01-*.spec.ts"],
            dependencies: ["timesheet-march"],
        },
    ],
});
