import { execFileSync } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

import { configureDestructiveTestDatabase } from "@/db/destructive-test-env";

configureDestructiveTestDatabase();

const RESET_TIMEOUT_MS = 120_000;

describe("db:reset integration", () => {
        let db: typeof import("@/lib/db").db;
        let schema: typeof import("@/db/schema");
        let publicHolidays: typeof import("./public-holidays").publicHolidays;
        let wipeDb: typeof import("@/db/wipe-db").wipeDb;
        let applyCustomSchemaArtifacts: typeof import("@/db/apply-custom-schema").applyCustomSchemaArtifacts;
        let seedDatabase: typeof import("./seed").seedDatabase;

        beforeAll(async () => {
            const libDb = await import("@/lib/db");
            db = libDb.db;

            schema = await import("@/db/schema");

            const publicHolidaySeed = await import("./public-holidays");
            publicHolidays = publicHolidaySeed.publicHolidays;

            const wipeModule = await import("@/db/wipe-db");
            wipeDb = wipeModule.wipeDb;

            const customSchemaModule = await import("@/db/apply-custom-schema");
            applyCustomSchemaArtifacts = customSchemaModule.applyCustomSchemaArtifacts;

            const seedModule = await import("./seed");
            seedDatabase = seedModule.seedDatabase;

            await wipeDb();
            execFileSync(
                process.platform === "win32" ? "npx.cmd" : "npx",
                ["drizzle-kit", "push", "--force"],
                { stdio: "inherit" },
            );
            await applyCustomSchemaArtifacts();
            await seedDatabase();
        }, RESET_TIMEOUT_MS);

        it("produces settled payroll history only for April through December 2025", async () => {
            const payrollRows = await db.select().from(schema.payrollTable);
            const payrollVoucherRows = await db.select().from(
                schema.payrollVoucherTable,
            );

            expect(payrollRows.length).toBeGreaterThan(0);
            expect(payrollRows.every((row) => row.status === "Settled")).toBe(true);
            expect(
                [...new Set(payrollRows.map((row) => row.periodStart.slice(0, 7)))],
            ).toEqual([
                "2025-04",
                "2025-05",
                "2025-06",
                "2025-07",
                "2025-08",
                "2025-09",
                "2025-10",
                "2025-11",
                "2025-12",
            ]);
            expect(
                payrollRows.some((row) => row.periodStart.startsWith("2026-")),
            ).toBe(false);
            expect(
                payrollVoucherRows.some((row) =>
                    row.voucherNumber?.startsWith("2026-"),
                ),
            ).toBe(false);
        });

        it("produces unpaid attendance for January through March 2026", async () => {
            const timesheetRows = await db.select().from(schema.timesheetTable);
            const openWindowRows = timesheetRows.filter((row) =>
                ["2026-01", "2026-02", "2026-03"].includes(
                    row.dateIn.slice(0, 7),
                ),
            );

            expect(openWindowRows.length).toBeGreaterThan(0);
            expect(
                [...new Set(openWindowRows.map((row) => row.dateIn.slice(0, 7)))],
            ).toEqual(["2026-01", "2026-02", "2026-03"]);
            expect(
                openWindowRows.every((row) => row.status === "Timesheet Unpaid"),
            ).toBe(true);
        });

        it("produces no advance artifacts in January through March 2026", async () => {
            const advanceRequestRows = await db
                .select()
                .from(schema.advanceRequestTable);
            const advanceRows = await db.select().from(schema.advanceTable);

            expect(
                advanceRequestRows.some((row) => row.requestDate.startsWith("2026-01")),
            ).toBe(false);
            expect(
                advanceRequestRows.some((row) => row.requestDate.startsWith("2026-02")),
            ).toBe(false);
            expect(
                advanceRequestRows.some((row) => row.requestDate.startsWith("2026-03")),
            ).toBe(false);
            expect(
                advanceRows.some((row) => row.repaymentDate?.startsWith("2026-01")),
            ).toBe(false);
            expect(
                advanceRows.some((row) => row.repaymentDate?.startsWith("2026-02")),
            ).toBe(false);
            expect(
                advanceRows.some((row) => row.repaymentDate?.startsWith("2026-03")),
            ).toBe(false);
        });

        it("keeps 2026 public holidays seeded as payroll master data", async () => {
            const publicHolidayRows = await db
                .select()
                .from(schema.publicHolidayTable);

            expect(publicHolidayRows).toHaveLength(publicHolidays.length);
            expect(
                publicHolidayRows
                    .filter((row) => row.date.startsWith("2026-"))
                    .map((row) => row.date),
            ).toEqual(
                publicHolidays
                    .filter((row) => row.date.startsWith("2026-"))
                    .map((row) => row.date),
            );
        });
});
