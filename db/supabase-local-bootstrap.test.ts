import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("Supabase local bootstrap contract", () => {
    it("commits the local Supabase config and exposes a documented start path", () => {
        const packageJson = JSON.parse(readRepoFile("package.json")) as {
            scripts?: Record<string, string>;
        };

        expect(readRepoFile("supabase/config.toml")).toContain("[db]");
        expect(readRepoFile("supabase/config.toml")).toContain("port = 54322");
        expect(packageJson.scripts?.["db:local:start"]).toBe("npx supabase start");
        expect(packageJson.scripts?.["db:local:status"]).toBe(
            "npx supabase status",
        );
        expect(readRepoFile(".env.example")).toContain(
            "DATABASE_ADMIN_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        );
        expect(readRepoFile(".env.example")).toContain(
            "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        );
        expect(readRepoFile("README.md")).toContain("npm run db:local:start");
        expect(readRepoFile("README.md")).toContain("DATABASE_ADMIN_URL");
    });
});
