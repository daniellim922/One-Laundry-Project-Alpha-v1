import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["{app,components,utils,lib,db,services}/**/*.test.{ts,tsx}"],
        exclude: ["node_modules", ".next", "test/e2e"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});
