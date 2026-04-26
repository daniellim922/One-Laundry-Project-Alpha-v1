import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { configureDestructiveTestDatabase } from "@/db/destructive-test-env";

configureDestructiveTestDatabase();

describe("seedWorkersAndHolidays integration", () => {
        let db: typeof import("@/lib/db").db;
        let seedWorkersAndHolidays: typeof import("./seed").seedWorkersAndHolidays;
        let workers: typeof import("./workers").workers;
        let publicHolidays: typeof import("./public-holidays").publicHolidays;
        let schema: typeof import("@/db/schema");
        let sql: typeof import("drizzle-orm").sql;

        beforeAll(async () => {
            const libDb = await import("@/lib/db");
            db = libDb.db;

            const seedMod = await import("./seed");
            seedWorkersAndHolidays = seedMod.seedWorkersAndHolidays;

            const workersMod = await import("./workers");
            workers = workersMod.workers;

            const phMod = await import("./public-holidays");
            publicHolidays = phMod.publicHolidays;

            schema = await import("@/db/schema");

            const orm = await import("drizzle-orm");
            sql = orm.sql;

            async function truncateAllTables() {
                await db.execute(sql`
                    TRUNCATE TABLE
                        "advance",
                        "advance_request",
                        "payroll",
                        "payroll_voucher",
                        "timesheet",
                        "worker",
                        "employment",
                        "public_holiday",
                        "expenses"
                    RESTART IDENTITY CASCADE
                `);
            }

            await truncateAllTables();
            await seedWorkersAndHolidays();
        });

        afterAll(async () => {
            await db.execute(sql`
                TRUNCATE TABLE
                    "advance",
                    "advance_request",
                    "payroll",
                    "payroll_voucher",
                    "timesheet",
                    "worker",
                    "employment",
                    "public_holiday",
                    "expenses"
                RESTART IDENTITY CASCADE
            `);
        });

        it("inserts all workers and their employments", async () => {
            const workerRows = await db.select().from(schema.workerTable);
            const employmentRows = await db.select().from(schema.employmentTable);

            expect(workerRows).toHaveLength(workers.length);
            expect(employmentRows).toHaveLength(workers.length);
        });

        it("inserts all public holidays", async () => {
            const phRows = await db.select().from(schema.publicHolidayTable);
            expect(phRows).toHaveLength(publicHolidays.length);
        });

        it("does not insert timesheets", async () => {
            const timesheetRows = await db.select().from(schema.timesheetTable);
            expect(timesheetRows).toHaveLength(0);
        });

        it("does not insert payrolls or payroll vouchers", async () => {
            const payrollRows = await db.select().from(schema.payrollTable);
            const voucherRows = await db.select().from(schema.payrollVoucherTable);
            expect(payrollRows).toHaveLength(0);
            expect(voucherRows).toHaveLength(0);
        });

        it("does not insert advances or advance requests", async () => {
            const advanceRows = await db.select().from(schema.advanceTable);
            const requestRows = await db.select().from(schema.advanceRequestTable);
            expect(advanceRows).toHaveLength(0);
            expect(requestRows).toHaveLength(0);
        });
});
