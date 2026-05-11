import "dotenv/config";
import { execSync } from "child_process";
import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { wipeDb } from "@/db/wipe-db";
import { seedWorkersAndHolidays } from "./seed";

async function main() {
    await wipeDb();
    execSync("npx drizzle-kit push", { stdio: "inherit" });
    await applyCustomSchemaArtifacts();
    await seedWorkersAndHolidays();
    process.exit(0);
}

main().catch((err: unknown) => {
    console.error("Failed to seed workers and holidays:", err);
    process.exit(1);
});
