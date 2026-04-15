import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("database workflow CI contract", () => {
    it("exposes a lightweight database contract test command", () => {
        const packageJson = JSON.parse(readRepoFile("package.json")) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.["test:db:contracts"]).toBe(
            "vitest run lib/database/runtime-config.test.ts lib/database/runtime-client.test.ts lib/database/admin-config.test.ts lib/database/admin-client.test.ts db/supabase-local-bootstrap.test.ts db/admin-connection-workflow.test.ts db/supabase-seed-workflow.test.ts db/supabase-rollout-contract.test.ts db/database-contracts-ci.test.ts",
        );
    });

    it("commits a GitHub Actions workflow that runs only lightweight database contract checks", () => {
        const workflow = readRepoFile(
            ".github/workflows/database-contracts.yml",
        );

        expect(workflow).toContain("name: Database Contracts");
        expect(workflow).toContain("pull_request:");
        expect(workflow).toContain("push:");
        expect(workflow).toContain("package.json");
        expect(workflow).toContain("package-lock.json");
        expect(workflow).toContain("lib/database/");
        expect(workflow).toContain("db/");
        expect(workflow).toContain("drizzle.config.ts");
        expect(workflow).toContain("supabase/");
        expect(workflow).toContain("README.md");
        expect(workflow).toContain("AGENTS.md");
        expect(workflow).toContain(".codex/docs/");
        expect(workflow).toContain("npm ci");
        expect(workflow).toContain("npm run test:db:contracts");
        expect(workflow).not.toContain("supabase start");
        expect(workflow).not.toContain("npm run test:e2e");
    });
});
