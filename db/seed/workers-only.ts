import "dotenv/config";
import { execSync } from "child_process";
import { assertDestructiveDatabaseActionAllowed } from "@/db/destructive-guard";
import { wipeDb } from "@/db/wipe-db";
import { seedWorkersAndHolidays } from "./seed";

async function main() {
    assertDestructiveDatabaseActionAllowed({
        action: "seed-workers",
        databaseUrl: process.env.DATABASE_URL,
    });

    await wipeDb({ skipGuard: true });
    execSync("npx drizzle-kit push", { stdio: "inherit" });
    await seedWorkersAndHolidays();
    process.exit(0);
}

main().catch((err: unknown) => {
    console.error("Failed to seed workers and holidays:", err);
    process.exit(1);
});
