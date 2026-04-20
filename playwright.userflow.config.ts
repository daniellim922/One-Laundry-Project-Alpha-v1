import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

/**
 * Userflow tests: exercise the app as a real user against a deployed environment
 * (e.g. production or staging). Does not start `npm run dev`; set the base URL explicitly.
 *
 * Execution order is a dependency queue (handoff JSON between stages):
 *   1. workers — create/edit permutations and persist worker-userflow-handoff.json
 *   2. timesheets — consumes worker handoff; writes timesheet-userflow-handoff.json
 *   3. advance — consumes worker handoff; writes advance-userflow-handoff.json
 *
 * Artifacts under outputDir are renamed after each test to stable folders: `01-worker-new`,
 * `01-worker-edit`, `02-timesheet-new`, `03-advance-new` (see register-userflow-result-folder.ts).
 *
 * Example:
 *   USERFLOW_BASE_URL=https://your-app.vercel.app npm run test:userflow
 */
const baseURL =
    process.env.USERFLOW_BASE_URL ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    "http://127.0.0.1:3000";

const userflowChrome = {
    ...devices["Desktop Chrome"],
};

export default defineConfig({
    testDir: "test/userflow",
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
        {
            name: "userflow-advance",
            dependencies: ["timesheet-followups"],
            testMatch: "advance/**/*.spec.ts",
            use: userflowChrome,
        },
    ],
});
