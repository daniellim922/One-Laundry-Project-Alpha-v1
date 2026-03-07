import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Wipes all data from the database by truncating all tables.
 * Schema (tables, columns, indexes) is preserved.
 */
async function wipeDb() {
    // Root tables only — CASCADE truncates dependent tables (session, account, user_roles, etc.)
    const tables = ['"user"', "roles", "features", "workers", "expenses", "verification"];

    console.log("Wiping database...");
    await db.execute(
        sql.raw(`TRUNCATE TABLE ${tables.join(", ")} CASCADE`)
    );
    console.log("Database wiped successfully.");
    process.exit(0);
}

wipeDb().catch((err) => {
    console.error("Failed to wipe database:", err);
    process.exit(1);
});
