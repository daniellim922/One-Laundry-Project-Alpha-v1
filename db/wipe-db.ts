import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

function rowsFromExecute<T extends Record<string, unknown>>(
    result: unknown,
    key: keyof T,
): T[] {
    if (Array.isArray(result)) {
        return result.filter(
            (r): r is T =>
                typeof r === "object" &&
                r !== null &&
                key in r &&
                typeof (r as T)[key] === "string",
        );
    }
    // Some drivers return { rows }
    // @ts-expect-error tolerate driver-specific result shapes
    const rows = result?.rows as unknown;
    if (!Array.isArray(rows)) return [];
    return rows.filter(
        (r): r is T =>
            typeof r === "object" &&
            r !== null &&
            key in r &&
            typeof (r as T)[key] === "string",
    );
}

/**
 * Destroys the application schema by dropping all app-owned tables in `public`
 * plus Drizzle's migration ledger in the `drizzle` schema (if present), then custom enum
 * types in `public`. The reset flow clears the database so `drizzle-kit push` can
 * apply `db/schema.ts` from scratch against the configured Postgres database.
 */
export async function wipeDb() {
    console.log("Discovering tables to drop...");

    const tableResult: unknown = await db.execute(sql`
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('public', 'drizzle')
    `);

    const tables = rowsFromExecute<{
        schemaname: string;
        tablename: string;
    }>(
        tableResult,
        "tablename",
    );

    if (tables.length > 0) {
        const dropStmt = `DROP TABLE IF EXISTS ${tables
            .map((table) => `"${table.schemaname}"."${table.tablename}"`)
            .join(", ")} CASCADE`;

        console.log(
            `Dropping tables: ${tables
                .map((table) => `${table.schemaname}.${table.tablename}`)
                .join(", ")}`,
        );
        await db.execute(sql.raw(dropStmt));
        console.log("All schema tables dropped successfully.");
    } else {
        console.log("No schema tables found to drop.");
    }

    console.log("Discovering custom enum types in public to drop...");
    const enumResult: unknown = await db.execute(sql`
        SELECT t.typname AS typname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typtype = 'e'
    `);

    const enumNames = rowsFromExecute<{ typname: string }>(
        enumResult,
        "typname",
    ).map((r) => r.typname);

    if (enumNames.length > 0) {
        for (const name of enumNames) {
            await db.execute(
                sql.raw(`DROP TYPE IF EXISTS "public"."${name}" CASCADE`),
            );
        }
        console.log(`Dropped enum types: ${enumNames.join(", ")}`);
    } else {
        console.log("No custom enum types found in public.");
    }
}

async function main() {
    await wipeDb();
    process.exit(0);
}

import { pathToFileURL } from "node:url";

const isMainModule =
    import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMainModule) {
    main().catch((err) => {
        console.error("Failed to wipe database:", err);
        process.exit(1);
    });
}
