import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
    return readFileSync(join(repoRoot, path), "utf8");
}

describe("admin database workflow contract", () => {
    it("routes schema-management tooling through the admin connection contract", () => {
        expect(readRepoFile("drizzle.config.ts")).toContain(
            "resolveAdminDatabaseConfig",
        );
        expect(readRepoFile("db/wipe-db.ts")).toContain(
            'from "@/lib/admin-db"',
        );
        expect(readRepoFile("db/seed/seed.ts")).toContain(
            'from "@/lib/admin-db"',
        );
    });

    it("documents the runtime and admin responsibility split", () => {
        const readme = readRepoFile("README.md");
        const agents = readRepoFile("AGENTS.md");

        expect(readme).toContain("DATABASE_RUNTIME_URL");
        expect(readme).toContain("DATABASE_ADMIN_URL");
        expect(readme).toContain("pooled/session connection path");
        expect(agents).toContain("Database connection roles are explicit.");
    });
});
