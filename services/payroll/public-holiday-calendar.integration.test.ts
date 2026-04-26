import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";

import { applyCustomSchemaArtifacts } from "@/db/apply-custom-schema";
import { employmentTable } from "@/db/tables/employmentTable";
import { workerTable } from "@/db/tables/workerTable";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { payrollVoucherTable } from "@/db/tables/payrollVoucherTable";
import { payrollTable } from "@/db/tables/payrollTable";
import { advanceRequestTable } from "@/db/tables/advanceRequestTable";
import { advanceTable } from "@/db/tables/advanceTable";
import { publicHolidayTable } from "@/db/tables/publicHolidayTable";
import { savePublicHolidaysForYear } from "@/services/payroll/public-holiday-calendar";

loadDotenv({ override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment variables");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

type FixtureIds = {
    employmentId: string;
    workerId: string;
    timesheetId: string;
    draftVoucherId: string;
    draftPayrollId: string;
    settledVoucherId: string;
    settledPayrollId: string;
    advanceRequestId: string;
    advanceId: string;
};

async function createFixture(): Promise<FixtureIds> {
    const employmentId = crypto.randomUUID();
    const workerId = crypto.randomUUID();
    const timesheetId = crypto.randomUUID();
    const draftVoucherId = crypto.randomUUID();
    const draftPayrollId = crypto.randomUUID();
    const settledVoucherId = crypto.randomUUID();
    const settledPayrollId = crypto.randomUUID();
    const advanceRequestId = crypto.randomUUID();
    const advanceId = crypto.randomUUID();

    await db.insert(employmentTable).values({
        id: employmentId,
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        minimumWorkingHours: 8,
        monthlyPay: 1000,
        hourlyRate: 10,
        restDayRate: 25,
        cpf: 0,
        paymentMethod: "Cash",
    });

    await db.insert(workerTable).values({
        id: workerId,
        employmentId,
        name: `PH fixture ${workerId.slice(0, 8)}`,
        status: "Active",
    });

    await db.insert(timesheetTable).values({
        id: timesheetId,
        workerId,
        dateIn: "2027-01-01",
        timeIn: "09:00:00",
        dateOut: "2027-01-01",
        timeOut: "17:00:00",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(payrollVoucherTable).values({
        id: draftVoucherId,
        publicHolidays: 99,
        publicHolidayPay: 99,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(payrollTable).values({
        id: draftPayrollId,
        workerId,
        payrollVoucherId: draftVoucherId,
        periodStart: "2027-01-01",
        periodEnd: "2027-01-31",
        payrollDate: "2027-02-05",
        status: "Draft",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(payrollVoucherTable).values({
        id: settledVoucherId,
        publicHolidays: 99,
        publicHolidayPay: 99,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(payrollTable).values({
        id: settledPayrollId,
        workerId,
        payrollVoucherId: settledVoucherId,
        periodStart: "2027-02-01",
        periodEnd: "2027-02-28",
        payrollDate: "2027-03-05",
        status: "Settled",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await db.insert(advanceRequestTable).values({
        id: advanceRequestId,
        workerId,
        requestDate: "2027-01-01",
        amountRequested: 100,
    });

    await db.insert(advanceTable).values({
        id: advanceId,
        advanceRequestId,
        amount: 100,
        repaymentDate: "2027-01-15",
    });

    return {
        employmentId,
        workerId,
        timesheetId,
        draftVoucherId,
        draftPayrollId,
        settledVoucherId,
        settledPayrollId,
        advanceRequestId,
        advanceId,
    };
}

async function cleanupFixture(ids: FixtureIds) {
    await db
        .delete(advanceTable)
        .where(eq(advanceTable.id, ids.advanceId));
    await db
        .delete(advanceRequestTable)
        .where(eq(advanceRequestTable.id, ids.advanceRequestId));
    await db
        .delete(payrollTable)
        .where(eq(payrollTable.id, ids.draftPayrollId));
    await db
        .delete(payrollTable)
        .where(eq(payrollTable.id, ids.settledPayrollId));
    await db
        .delete(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, ids.draftVoucherId));
    await db
        .delete(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, ids.settledVoucherId));
    await db
        .delete(timesheetTable)
        .where(eq(timesheetTable.id, ids.timesheetId));
    await db
        .delete(workerTable)
        .where(eq(workerTable.id, ids.workerId));
    await db
        .delete(employmentTable)
        .where(eq(employmentTable.id, ids.employmentId));
}

async function seedHolidays() {
    await db.insert(publicHolidayTable).values([
        { date: "2026-07-20", name: "Preservation Day 2026" },
        { date: "2027-01-01", name: "New Year's Day 2027" },
        { date: "2027-05-01", name: "Labour Day 2027" },
    ]);
}

async function cleanupHolidays() {
    await db
        .delete(publicHolidayTable)
        .where(eq(publicHolidayTable.date, "2026-07-20"));
    await db
        .delete(publicHolidayTable)
        .where(eq(publicHolidayTable.date, "2027-01-01"));
    await db
        .delete(publicHolidayTable)
        .where(eq(publicHolidayTable.date, "2027-05-01"));
}

describe.sequential("public holiday year replacement data preservation", () => {
    beforeAll(async () => {
        await applyCustomSchemaArtifacts(db);
    });

    afterAll(async () => {
        await client.end();
    });

    it("replaces only the selected year's holidays and refreshes Draft payrolls while leaving Settled frozen", async () => {
        const fixture = await createFixture();
        await seedHolidays();

        try {
            const result = await savePublicHolidaysForYear(
                {
                    year: 2027,
                    holidays: [
                        { date: "2027-05-01", name: "Labour Day 2027" },
                    ],
                },
                db,
            );

            expect(result).toEqual({
                success: true,
                saved: 1,
                affectedPayrollIds: [fixture.draftPayrollId],
            });

            // Other-year holiday preserved
            const holidays2026 = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2026-07-20"));
            expect(holidays2026).toHaveLength(1);
            expect(holidays2026[0]?.name).toBe("Preservation Day 2026");

            // Selected-year holiday replaced
            const holidays2027May = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2027-05-01"));
            expect(holidays2027May).toHaveLength(1);
            expect(holidays2027May[0]?.name).toBe("Labour Day 2027");

            const removedHoliday = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2027-01-01"));
            expect(removedHoliday).toHaveLength(0);

            // Draft payroll refreshed (no worked holiday in period now)
            const [draftVoucher] = await db
                .select()
                .from(payrollVoucherTable)
                .where(eq(payrollVoucherTable.id, fixture.draftVoucherId));
            expect(draftVoucher?.publicHolidays).toBe(0);
            expect(draftVoucher?.publicHolidayPay).toBe(0);

            // Settled payroll frozen
            const [settledVoucher] = await db
                .select()
                .from(payrollVoucherTable)
                .where(eq(payrollVoucherTable.id, fixture.settledVoucherId));
            expect(settledVoucher?.publicHolidays).toBe(99);
            expect(settledVoucher?.publicHolidayPay).toBe(99);

            // Unrelated tables untouched
            const [worker] = await db
                .select()
                .from(workerTable)
                .where(eq(workerTable.id, fixture.workerId));
            expect(worker).toBeDefined();
            expect(worker?.name).toBe(
                `PH fixture ${fixture.workerId.slice(0, 8)}`,
            );

            const [timesheet] = await db
                .select()
                .from(timesheetTable)
                .where(eq(timesheetTable.id, fixture.timesheetId));
            expect(timesheet).toBeDefined();

            const [advance] = await db
                .select()
                .from(advanceTable)
                .where(eq(advanceTable.id, fixture.advanceId));
            expect(advance).toBeDefined();
        } finally {
            await cleanupHolidays();
            await cleanupFixture(fixture);
        }
    });

    it("clears the selected year when saving an empty holiday list", async () => {
        const fixture = await createFixture();
        await seedHolidays();

        try {
            const result = await savePublicHolidaysForYear(
                {
                    year: 2027,
                    holidays: [],
                },
                db,
            );

            expect(result).toEqual({
                success: true,
                saved: 0,
                affectedPayrollIds: [fixture.draftPayrollId],
            });

            // Selected-year holidays cleared
            const holidays2027Jan = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2027-01-01"));
            expect(holidays2027Jan).toHaveLength(0);

            const holidays2027May = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2027-05-01"));
            expect(holidays2027May).toHaveLength(0);

            // Other-year holiday preserved
            const holidays2026 = await db
                .select()
                .from(publicHolidayTable)
                .where(eq(publicHolidayTable.date, "2026-07-20"));
            expect(holidays2026).toHaveLength(1);

            // Draft payroll refreshed (no holidays in period)
            const [draftVoucher] = await db
                .select()
                .from(payrollVoucherTable)
                .where(eq(payrollVoucherTable.id, fixture.draftVoucherId));
            expect(draftVoucher?.publicHolidays).toBe(0);

            // Settled payroll frozen
            const [settledVoucher] = await db
                .select()
                .from(payrollVoucherTable)
                .where(eq(payrollVoucherTable.id, fixture.settledVoucherId));
            expect(settledVoucher?.publicHolidays).toBe(99);

            // Unrelated tables untouched
            const [worker] = await db
                .select()
                .from(workerTable)
                .where(eq(workerTable.id, fixture.workerId));
            expect(worker).toBeDefined();
        } finally {
            await cleanupHolidays();
            await cleanupFixture(fixture);
        }
    });
});
