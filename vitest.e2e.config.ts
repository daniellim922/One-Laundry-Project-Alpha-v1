import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.e2e.test.{ts,tsx}"],
        exclude: ["node_modules", ".next"],
        environment: "node",
        testTimeout: 60_000,
        hookTimeout: 120_000,
        fileParallelism: false,
        maxConcurrency: 1,
        sequence: {
            concurrent: false,
        },
        pool: "forks",
        env: {
            NODE_ENV: "test",
            USERFLOW_BASE_URL:
                process.env.USERFLOW_BASE_URL ?? "http://localhost:3000",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
