import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { employmentTable } from "@/db/tables/employmentTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment variables");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

type TimesheetFixture = {
    employmentId: string;
    workerId: string;
    timesheetId: string;
};

function getErrorMessage(error: unknown) {
    if (!(error instanceof Error)) {
        return String(error);
    }

    if (
        error.cause &&
        typeof error.cause === "object" &&
        "message" in error.cause
    ) {
        return String(error.cause.message);
    }

    return error.message;
}

async function createTimesheetFixture(): Promise<TimesheetFixture> {
    const employmentId = crypto.randomUUID();
    const workerId = crypto.randomUUID();
    const timesheetId = crypto.randomUUID();

    await db.insert(employmentTable).values({
        id: employmentId,
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        paymentMethod: "Cash",
    });

    await db.insert(workerTable).values({
        id: workerId,
        employmentId,
        name: `Timesheet fixture ${workerId.slice(0, 8)}`,
        status: "Active",
    });

    await db.insert(timesheetTable).values({
        id: timesheetId,
        workerId,
        dateIn: "2026-03-01",
        timeIn: "09:00:00",
        dateOut: "2026-03-01",
        timeOut: "17:00:00",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return {
        employmentId,
        workerId,
        timesheetId,
    };
}

async function cleanupTimesheetFixture(fixture: TimesheetFixture) {
    await db.delete(timesheetTable).where(eq(timesheetTable.id, fixture.timesheetId));
    await db.delete(workerTable).where(eq(workerTable.id, fixture.workerId));
    await db
        .delete(employmentTable)
        .where(eq(employmentTable.id, fixture.employmentId));
}

describe("timesheet table hours invariant", () => {
    beforeAll(async () => {
        await applyCustomSchemaArtifacts(db);
    });

    afterAll(async () => {
        await client.end();
    });

    it("updates hours automatically when timeOut changes", async () => {
        const fixture = await createTimesheetFixture();

        try {
            const [insertedEntry] = await db
                .select({
                    hours: timesheetTable.hours,
                })
                .from(timesheetTable)
                .where(eq(timesheetTable.id, fixture.timesheetId));

            expect(insertedEntry?.hours).toBeCloseTo(8, 5);

            await db
                .update(timesheetTable)
                .set({
                    timeOut: "18:00:00",
                    updatedAt: new Date(),
                })
                .where(eq(timesheetTable.id, fixture.timesheetId));

            const [updatedEntry] = await db
                .select({
                    hours: timesheetTable.hours,
                })
                .from(timesheetTable)
                .where(eq(timesheetTable.id, fixture.timesheetId));

            expect(updatedEntry?.hours).toBeCloseTo(9, 5);
        } finally {
            await cleanupTimesheetFixture(fixture);
        }
    });

    it("backfills existing rows when the mutable hours column is migrated", async () => {
        const employmentId = crypto.randomUUID();
        const workerId = crypto.randomUUID();
        const timesheetId = crypto.randomUUID();

        await db.execute(sql.raw(`
            ALTER TABLE "timesheet" DROP COLUMN "hours";
            ALTER TABLE "timesheet" ADD COLUMN "hours" real NOT NULL DEFAULT 0;
        `));

        try {
            await db.insert(employmentTable).values({
                id: employmentId,
                employmentType: "Full Time",
                employmentArrangement: "Local Worker",
                paymentMethod: "Cash",
            });

            await db.insert(workerTable).values({
                id: workerId,
                employmentId,
                name: `Legacy timesheet fixture ${workerId.slice(0, 8)}`,
                status: "Active",
            });

            await db.execute(sql`
                INSERT INTO "timesheet" (
                    "id",
                    "worker_id",
                    "date_in",
                    "time_in",
                    "date_out",
                    "time_out",
                    "hours",
                    "created_at",
                    "updated_at"
                )
                VALUES (
                    ${timesheetId},
                    ${workerId},
                    ${"2026-04-01"},
                    ${"09:00:00"},
                    ${"2026-04-01"},
                    ${"17:00:00"},
                    ${0},
                    NOW(),
                    NOW()
                )
            `);

            await applyCustomSchemaArtifacts(db);

            const [migratedEntry] = await db
                .select({
                    hours: timesheetTable.hours,
                })
                .from(timesheetTable)
                .where(eq(timesheetTable.id, timesheetId));

            expect(migratedEntry?.hours).toBeCloseTo(8, 5);
        } finally {
            await db.delete(timesheetTable).where(eq(timesheetTable.id, timesheetId));
            await db.delete(workerTable).where(eq(workerTable.id, workerId));
            await db
                .delete(employmentTable)
                .where(eq(employmentTable.id, employmentId));
            await applyCustomSchemaArtifacts(db);
        }
    });

    it("rejects direct SQL updates to the generated hours column", async () => {
        const fixture = await createTimesheetFixture();

        try {
            const directUpdate = db.execute(sql`
                UPDATE "timesheet"
                SET "hours" = ${99}
                WHERE "id" = ${fixture.timesheetId}
            `);

            await expect(directUpdate).rejects.toSatisfy((error) =>
                /generated column|can only be updated to DEFAULT/i.test(
                    getErrorMessage(error),
                ),
            );
        } finally {
            await cleanupTimesheetFixture(fixture);
        }
    });
});
