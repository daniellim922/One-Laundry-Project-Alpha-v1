import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const PAYROLL_PERIOD_OVERLAP_CONSTRAINT_NAME =
    "payroll_worker_period_no_overlap";

type SchemaExecutor = Pick<typeof db, "execute">;

export async function applyCustomSchemaArtifacts(
    executor: SchemaExecutor = db,
) {
    await executor.execute(
        sql.raw(`
            CREATE EXTENSION IF NOT EXISTS btree_gist;

            ALTER TABLE "payroll"
            DROP CONSTRAINT IF EXISTS "${PAYROLL_PERIOD_OVERLAP_CONSTRAINT_NAME}";

            ALTER TABLE "payroll"
            ADD CONSTRAINT "${PAYROLL_PERIOD_OVERLAP_CONSTRAINT_NAME}"
            EXCLUDE USING gist (
                "worker_id" WITH =,
                -- Keep the end boundary exclusive at the DB constraint layer so
                -- adjacent periods that touch on the handoff date remain valid.
                daterange("period_start", "period_end", '[)') WITH &&
            );
        `),
    );
}

async function main() {
    await applyCustomSchemaArtifacts();
    await db.$client.end();
}

if (import.meta.main) {
    void main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
