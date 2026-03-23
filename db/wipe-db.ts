import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Destroys the application schema by dropping all user tables.
 * This removes tables entirely (not just their data).
 */
async function wipeDb() {
    console.log("Discovering tables to drop...");

    // Get all non-Drizzle tables in the public schema
    const result = await db.execute<
        { tablename: string }
    >(sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'drizzle_%'
    `);

    const tables =
        Array.isArray(result)
            ? result.map((r: any) => r.tablename)
            : // Some drivers return { rows }
              // @ts-ignore – be tolerant of different result shapes
              result.rows?.map((r: any) => r.tablename) ?? [];

    if (!tables.length) {
        console.log("No user tables found to drop.");
        process.exit(0);
    }

    const dropStmt = `DROP TABLE IF EXISTS ${tables
        .map((t) => `"${t}"`)
        .join(", ")} CASCADE`;

    console.log(`Dropping tables: ${tables.join(", ")}`);
    await db.execute(sql.raw(dropStmt));

    console.log("All user tables dropped successfully.");
    process.exit(0);
}

wipeDb().catch((err) => {
    console.error("Failed to wipe database:", err);
    process.exit(1);
});
