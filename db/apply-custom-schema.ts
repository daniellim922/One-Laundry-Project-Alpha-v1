import "dotenv/config";

import { pathToFileURL } from "node:url";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const PAYROLL_PERIOD_OVERLAP_CONSTRAINT_NAME =
    "payroll_worker_period_no_overlap";
export const TIMESHEET_HOURS_GENERATED_EXPRESSION = `
    (extract(epoch from (("date_out" + "time_out") - ("date_in" + "time_in"))) / 3600.0)::real
`;

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

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'timesheet'
                      AND column_name = 'hours'
                      AND is_generated = 'NEVER'
                ) THEN
                    ALTER TABLE "timesheet" DROP COLUMN "hours";
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'timesheet'
                      AND column_name = 'hours'
                      AND is_generated = 'ALWAYS'
                ) THEN
                    ALTER TABLE "timesheet"
                    ADD COLUMN "hours" real GENERATED ALWAYS AS (${TIMESHEET_HOURS_GENERATED_EXPRESSION}) STORED;
                END IF;
            END
            $$;

            CREATE UNIQUE INDEX IF NOT EXISTS timesheet_worker_date_time_in_uniq
            ON "timesheet" ("worker_id", "date_in", "time_in");
        `),
    );
}

async function main() {
    await applyCustomSchemaArtifacts();
    await db.$client.end();
}

const isMainModule =
    process.argv[1] != null &&
    import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    void main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
