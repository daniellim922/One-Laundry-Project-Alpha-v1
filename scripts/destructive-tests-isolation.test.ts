import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..");

const destructiveDbTestFiles = [
    "db/seed/reset.test.ts",
    "db/seed/workers-only.test.ts",
    "db/tables/payrollTable.test.ts",
    "db/tables/timesheetTable.test.ts",
    "services/payroll/generate-voucher-number.test.ts",
];

function readProjectFile(filePath: string) {
    return readFileSync(path.join(repoRoot, filePath), "utf8");
}

describe("destructive database test isolation", () => {
    it("keeps live or destructive database tests out of the default Vitest config", () => {
        const defaultConfig = readProjectFile("vitest.config.ts");

        for (const filePath of destructiveDbTestFiles) {
            expect(defaultConfig).toContain(filePath);
        }
    });

    it("runs destructive database tests only through an explicit script and config", () => {
        const packageJson = JSON.parse(readProjectFile("package.json")) as {
            scripts: Record<string, string>;
        };
        const destructiveConfig = readProjectFile("vitest.db-destructive.config.ts");

        expect(packageJson.scripts["test:db:destructive"]).toBe(
            "vitest run -c vitest.db-destructive.config.ts",
        );

        for (const filePath of destructiveDbTestFiles) {
            expect(destructiveConfig).toContain(filePath);
        }

        expect(destructiveConfig).toContain(
            "ONE_LAUNDRY_DESTRUCTIVE_TEST_DATABASE_URL",
        );
    });
});
