import "dotenv/config";
import { sql } from "drizzle-orm";
import { adminDb } from "@/lib/admin-db";

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
 * Destroys the application schema by dropping all user tables, then custom
 * enum types in `public`. Enum cleanup matters after enum renames (e.g.
 * `loan_paid_status` → `advance_loan_status`): `drizzle-kit push` can fail if
 * a stale enum type still exists with the wrong labels.
 */
async function wipeDb() {
    console.log("Discovering tables to drop...");

    const tableResult: unknown = await adminDb.execute(sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'drizzle_%'
    `);

    const tables = rowsFromExecute<{ tablename: string }>(
        tableResult,
        "tablename",
    ).map((r) => r.tablename);

    if (tables.length > 0) {
        const dropStmt = `DROP TABLE IF EXISTS ${tables
            .map((t) => `"${t}"`)
            .join(", ")} CASCADE`;

        console.log(`Dropping tables: ${tables.join(", ")}`);
        await adminDb.execute(sql.raw(dropStmt));
        console.log("All user tables dropped successfully.");
    } else {
        console.log("No user tables found to drop.");
    }

    console.log("Discovering custom enum types in public to drop...");
    const enumResult: unknown = await adminDb.execute(sql`
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
            await adminDb.execute(
                sql.raw(`DROP TYPE IF EXISTS "public"."${name}" CASCADE`),
            );
        }
        console.log(`Dropped enum types: ${enumNames.join(", ")}`);
    } else {
        console.log("No custom enum types found in public.");
    }

    process.exit(0);
}

wipeDb().catch((err) => {
    console.error("Failed to wipe database:", err);
    process.exit(1);
});
