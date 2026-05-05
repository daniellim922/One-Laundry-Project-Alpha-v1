import "dotenv/config";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { wipeDb } from "@/db/wipe-db";
import { seedDatabase } from "@/db/seed/seed";
import { wipeStorage } from "@/lib/supabase/storage";

export async function resetDatabase() {
    await wipeDb();
    await wipeStorage();
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
