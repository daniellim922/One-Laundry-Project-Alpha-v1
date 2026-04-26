import path from "path";
import { defineConfig } from "vitest/config";

/** Need a reachable Postgres at `DATABASE_URL` (not the Vitest placeholder). */
const postgresIntegrationTestFiles = [
    "db/tables/payrollTable.test.ts",
    "db/tables/timesheetTable.test.ts",
    "services/payroll/public-holiday-calendar.integration.test.ts",
    "services/payroll/generate-voucher-number.test.ts",
];

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "{app,components,utils,lib,db,services,scripts}/**/*.test.{ts,tsx}",
        ],
        exclude: ["node_modules", ".next", ...postgresIntegrationTestFiles],
        // `lib/db` throws if unset; unit tests import modules that transitively load `db`.
        // Tests do not require a live Postgres instance unless they execute queries.
        env: {
            DATABASE_URL:
                process.env.DATABASE_URL ??
                "postgresql://127.0.0.1:5432/vitest_placeholder",
        },
        testTimeout: 15_000,
        coverage: {
            provider: "v8",
            include: ["services/payroll/**/*.ts", "services/timesheet/**/*.ts"],
            exclude: [
                "**/*.test.ts",
                "**/*.test.tsx",
                "**/*.d.ts",
                "services/**/*.integration.test.ts",
            ],
            thresholds: {
                lines: 35,
                branches: 25,
                functions: 30,
                statements: 35,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
