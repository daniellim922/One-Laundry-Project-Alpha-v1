import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: [
            "{app,components,utils,lib,db,services,scripts,test/userflow}/**/*.test.{ts,tsx}",
        ],
        exclude: ["node_modules", ".next", "test/e2e"],
        // `lib/db` throws if unset; unit tests import modules that transitively load `db`.
        // Tests do not require a live Postgres instance unless they execute queries.
        env: {
            DATABASE_URL:
                process.env.DATABASE_URL ??
                "postgresql://127.0.0.1:5432/vitest_placeholder",
        },
        // jsdom + user-event suites can exceed 5s under parallel workers.
        testTimeout: 15_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
