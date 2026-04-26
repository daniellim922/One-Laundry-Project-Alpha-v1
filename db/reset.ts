import "dotenv/config";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { assertDestructiveDatabaseActionAllowed } from "@/db/destructive-guard";
import { wipeDb } from "@/db/wipe-db";
import { seedDatabase } from "@/db/seed/seed";

export async function resetDatabase() {
    assertDestructiveDatabaseActionAllowed({
        action: "reset",
        databaseUrl: process.env.DATABASE_URL,
    });

    await wipeDb({ skipGuard: true });
    execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", [
        "drizzle-kit",
        "push",
        "--force",
    ], {
        stdio: "inherit",
    });
    await applyCustomSchemaArtifacts();
    await seedDatabase();
}

async function main() {
    await resetDatabase();
    process.exit(0);
}

const isMainModule =
    import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMainModule) {
    main().catch((err: unknown) => {
        console.error("Failed to reset database:", err);
        process.exit(1);
    });
}
