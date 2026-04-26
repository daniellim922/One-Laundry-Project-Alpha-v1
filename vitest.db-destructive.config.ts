import path from "path";
import { defineConfig } from "vitest/config";

import {
    configureDestructiveTestDatabase,
} from "./db/destructive-test-env";

const destructiveTestDatabaseUrlEnv =
    "ONE_LAUNDRY_DESTRUCTIVE_TEST_DATABASE_URL";

configureDestructiveTestDatabase();

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "db/seed/reset.test.ts",
            "db/seed/workers-only.test.ts",
            "db/tables/payrollTable.test.ts",
            "db/tables/timesheetTable.test.ts",
            "services/payroll/public-holiday-calendar.integration.test.ts",
            "services/payroll/generate-voucher-number.test.ts",
        ],
        exclude: ["node_modules", ".next", "test/e2e"],
        env: {
            DATABASE_URL: process.env[destructiveTestDatabaseUrlEnv],
        },
        fileParallelism: false,
        testTimeout: 120_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
