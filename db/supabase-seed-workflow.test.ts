import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("Supabase local seeded workflow contract", () => {
    it("exposes a Supabase-first command surface while keeping reset, schema push, and seed responsibilities split", () => {
        const packageJson = JSON.parse(readRepoFile("package.json")) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.["supabase:db:reset"]).toBe(
            "npm run supabase:db:wipe && npm run supabase:db:migrate && npm run supabase:db:seed",
        );
        expect(packageJson.scripts?.["supabase:db:migrate"]).toBe(
            "npx tsx db/push-schema.ts",
        );
        expect(packageJson.scripts?.["supabase:db:seed"]).toBe(
            "npx tsx db/seed/seed.ts",
        );
        expect(packageJson.scripts?.["supabase:db:wipe"]).toBe(
            "npx tsx db/wipe-db.ts",
        );
        expect(packageJson.scripts?.["db:reset"]).toBe("npm run supabase:db:reset");
        expect(packageJson.scripts?.["supabase:db:generate"]).toBeUndefined();
        expect(packageJson.scripts?.["db:generate"]).toBeUndefined();
    });

    it("applies schema via drizzle-kit push from db/push-schema.ts", () => {
        const pushScript = readRepoFile("db/push-schema.ts");
        expect(pushScript).toContain("drizzle-kit push");
        expect(pushScript).toContain("resolveAdminDatabaseConfig");
    });

    it("documents the Supabase-first seeded local workflow for developers and tests", () => {
        const readme = readRepoFile("README.md");
        const agents = readRepoFile("AGENTS.md");

        expect(readme).toContain("npm run supabase:db:reset");
        expect(readme).toContain("reset, push schema, and seed");
        expect(readme).toContain("Run `npm run supabase:db:reset` first.");
        expect(agents).toContain("npm run supabase:db:reset");
        expect(agents).toContain("loads a deterministic 12-month historical dataset");
    });

    it("resets database state so the schema can be reapplied from scratch", () => {
        const wipeScript = readRepoFile("db/wipe-db.ts");

        expect(wipeScript).toContain("schemaname IN ('public', 'drizzle')");
        expect(wipeScript).toContain('"\${table.schemaname}"."\${table.tablename}"');
    });

    it("gitignores generated drizzle migration artifacts", () => {
        const gitignore = readRepoFile(".gitignore");
        expect(gitignore).toContain("/drizzle/");
    });
});
