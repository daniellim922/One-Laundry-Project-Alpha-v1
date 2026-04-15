import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("Supabase rollout documentation contract", () => {
    it("includes the rollout contract in the lightweight database docs suite", () => {
        const packageJson = JSON.parse(readRepoFile("package.json")) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.["test:db:contracts"]).toContain(
            "db/supabase-rollout-contract.test.ts",
        );
    });

    it("documents migration ownership and the rollout decision points", () => {
        const readme = readRepoFile("README.md");
        const agents = readRepoFile("AGENTS.md");
        const rollout = readRepoFile(".codex/docs/supabase-rollout-contract.md");

        expect(readme).toContain("Migration ownership");
        expect(readme).toContain("DATABASE_RUNTIME_URL");
        expect(readme).toContain("DATABASE_ADMIN_URL");

        expect(agents).toContain(".codex/docs/supabase-rollout-contract.md");
        expect(agents).toContain("Production rollout");

        expect(rollout).toContain("# Supabase Production Rollout Contract");
        expect(rollout).toContain("## Launch Prerequisites");
        expect(rollout).toContain("## Smoke Checks");
        expect(rollout).toContain("## Rollback Expectations");
        expect(rollout).toContain("## Human Review");
        expect(rollout).toContain("Issue #63");
    });
});
