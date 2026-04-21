import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

/**
 * Userflow tests: exercise the app as a real user against a deployed environment
 * (e.g. production or staging). Does not start `npm run dev`; set the base URL explicitly.
 *
 * Execution order is a dependency queue (handoff JSON between stages):
 *   1. workers — create/edit permutations and persist worker-userflow-handoff.json
 *   2. timesheets — April import, May import, then June manual smoke; June writes timesheet-userflow-handoff.json
 *   3. payroll
 *   4. advance — consumes worker handoff; writes advance-userflow-handoff.json
 *
 * Artifacts under outputDir are renamed after each test to stable folders
 * (see register-userflow-result-folder.ts).
 *
 * Example:
 *   USERFLOW_BASE_URL=https://your-app.vercel.app npm run test:userflow
 *
 * Timeouts: userflows hit a real deploy + DB (cold starts, slow first paint). Override if needed:
 *   USERFLOW_TEST_TIMEOUT_MS — per-test ceiling (default 300000)
 *   USERFLOW_EXPECT_TIMEOUT_MS — default assertion wait (default 90000)
 */
const baseURL =
    process.env.USERFLOW_BASE_URL ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    "http://127.0.0.1:3000";

const userflowTestTimeoutMs = Number(
    process.env.USERFLOW_TEST_TIMEOUT_MS ?? 300_000,
);
const userflowExpectTimeoutMs = Number(
    process.env.USERFLOW_EXPECT_TIMEOUT_MS ?? 90_000,
);

const userflowChrome = {
    ...devices["Desktop Chrome"],
};

export default defineConfig({
    testDir: "test/userflow",
    outputDir: "test/results-userflow",
    /** Cold deploy/DB: allow long flows without racing the default 30s test cap. */
    timeout: userflowTestTimeoutMs,
    expect: {
        timeout: userflowExpectTimeoutMs,
    },
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
            name: "timesheet-april-import",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["timesheets/01-timesheet-april-import-userflow.spec.ts"],
            dependencies: ["worker-edit"],
        },
        {
            name: "timesheet-may-import",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["timesheets/02-timesheet-may-import-userflow.spec.ts"],
            dependencies: ["timesheet-april-import"],
        },
        {
            name: "timesheet-june-manual",
            use: {
                ...devices["Desktop Chrome"],
            },
            testMatch: ["timesheets/03-timesheet-june-userflow.spec.ts"],
            dependencies: ["timesheet-may-import"],
        },
        {
            name: "userflow-payroll",
            dependencies: ["timesheet-june-manual"],
            testMatch: "payroll/**/*.spec.ts",
            use: userflowChrome,
        },
        {
            name: "userflow-advance",
            dependencies: ["userflow-payroll"],
            testMatch: "advance/**/*.spec.ts",
            use: userflowChrome,
        },
    ],
});
