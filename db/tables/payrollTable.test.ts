import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { config as loadDotenv } from "dotenv";
import postgres from "postgres";

import { employmentTable } from "@/db/tables/employmentTable";
import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { payrollTable } from "@/db/tables/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { workerTable } from "@/db/tables/workerTable";

loadDotenv({ override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment variables");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

type PayrollFixture = {
    employmentId: string;
    workerId: string;
    voucherIds: string[];
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

async function createPayrollFixture(): Promise<PayrollFixture> {
    const employmentId = crypto.randomUUID();
    const workerId = crypto.randomUUID();

    await db.insert(employmentTable).values({
        id: employmentId,
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        paymentMethod: "Cash",
    });

    await db.insert(workerTable).values({
        id: workerId,
        employmentId,
        name: `Payroll overlap fixture ${workerId.slice(0, 8)}`,
        status: "Active",
    });

    return {
        employmentId,
        workerId,
        voucherIds: [],
    };
}

async function insertPayroll(
    fixture: PayrollFixture,
    input: {
        periodStart: string;
        periodEnd: string;
        payrollDate: string;
    },
) {
    const voucherId = crypto.randomUUID();
    fixture.voucherIds.push(voucherId);

    await db.insert(payrollVoucherTable).values({
        id: voucherId,
    });

    await db.insert(payrollTable).values({
        workerId: fixture.workerId,
        payrollVoucherId: voucherId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        payrollDate: input.payrollDate,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

async function cleanupPayrollFixture(fixture: PayrollFixture) {
    await db.delete(payrollTable).where(eq(payrollTable.workerId, fixture.workerId));

    for (const voucherId of fixture.voucherIds) {
        await db
            .delete(payrollVoucherTable)
            .where(eq(payrollVoucherTable.id, voucherId));
    }

    await db.delete(workerTable).where(eq(workerTable.id, fixture.workerId));
    await db
        .delete(employmentTable)
        .where(eq(employmentTable.id, fixture.employmentId));
}

describe("payroll table overlap constraint", () => {
    beforeAll(async () => {
        await applyCustomSchemaArtifacts(db);
    });

    afterAll(async () => {
        await client.end();
    });

    it("rejects direct inserts for overlapping payroll periods for the same worker", async () => {
        const fixture = await createPayrollFixture();

        try {
            await insertPayroll(fixture, {
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-02",
            });

            const overlappingInsert = insertPayroll(fixture, {
                periodStart: "2026-01-15",
                periodEnd: "2026-02-15",
                payrollDate: "2026-02-16",
            });

            await expect(overlappingInsert).rejects.toBeDefined();

            await overlappingInsert.catch((error) => {
                expect(getErrorMessage(error)).toMatch(/exclusion constraint/i);
            });
        } finally {
            await cleanupPayrollFixture(fixture);
        }
    });

    it("allows inserting non-overlapping payroll periods for the same worker", async () => {
        const fixture = await createPayrollFixture();

        try {
            await insertPayroll(fixture, {
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-02",
            });

            await expect(
                insertPayroll(fixture, {
                    periodStart: "2026-02-01",
                    periodEnd: "2026-02-28",
                    payrollDate: "2026-03-01",
                }),
            ).resolves.toBeUndefined();
        } finally {
            await cleanupPayrollFixture(fixture);
        }
    });

    it("allows edge-touching payroll periods where the second period starts on the first period end date", async () => {
        const fixture = await createPayrollFixture();

        try {
            await insertPayroll(fixture, {
                periodStart: "2026-01-01",
                periodEnd: "2026-01-31",
                payrollDate: "2026-02-02",
            });

            await expect(
                insertPayroll(fixture, {
                    periodStart: "2026-01-31",
                    periodEnd: "2026-02-28",
                    payrollDate: "2026-03-01",
                }),
            ).resolves.toBeUndefined();
        } finally {
            await cleanupPayrollFixture(fixture);
        }
    });
});
