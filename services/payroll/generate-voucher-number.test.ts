import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { configureDestructiveTestDatabase } from "@/db/destructive-test-env";

configureDestructiveTestDatabase();

const COUNTER_TABLE_NAME = "payroll_voucher_counter";

let db: typeof import("@/lib/db").db;
let generateVoucherNumber: typeof import("@/services/payroll/generate-voucher-number").generateVoucherNumber;

async function ensureVoucherCounterTable() {
    // Keep the DB-backed test self-contained when the local test DB has not been
    // pushed from the latest Drizzle schema yet.
    await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS "${COUNTER_TABLE_NAME}" (
            "year" integer PRIMARY KEY,
            "current_value" integer NOT NULL DEFAULT 0,
            "created_at" timestamp without time zone NOT NULL DEFAULT now(),
            "updated_at" timestamp without time zone NOT NULL DEFAULT now()
        )
    `));
}

async function resetVoucherCounterTable() {
    await db.execute(sql.raw(`TRUNCATE TABLE "${COUNTER_TABLE_NAME}"`));
}

describe("generateVoucherNumber", () => {
    beforeAll(async () => {
        const dbModule = await import("@/lib/db");
        db = dbModule.db;

        const voucherNumberModule = await import(
            "@/services/payroll/generate-voucher-number"
        );
        generateVoucherNumber = voucherNumberModule.generateVoucherNumber;

        await ensureVoucherCounterTable();
    });

    beforeEach(async () => {
        await resetVoucherCounterTable();
    });

    afterAll(async () => {
        await resetVoucherCounterTable();
        await db.$client.end();
    });

    it("returns the first voucher number for a year as 0001", async () => {
        await expect(generateVoucherNumber(2025)).resolves.toBe("2025-0001");
    });

    it("increments voucher numbers sequentially within the same year", async () => {
        await expect(generateVoucherNumber(2025)).resolves.toBe("2025-0001");
        await expect(generateVoucherNumber(2025)).resolves.toBe("2025-0002");
    });

    it("resets numbering when a new year starts", async () => {
        await expect(generateVoucherNumber(2025)).resolves.toBe("2025-0001");
        await expect(generateVoucherNumber(2026)).resolves.toBe("2026-0001");
    });

    it("allocates unique sequential numbers under concurrent requests", async () => {
        const voucherNumbers = await Promise.all(
            Array.from({ length: 5 }, () => generateVoucherNumber(2025)),
        );

        expect([...voucherNumbers].sort()).toEqual([
            "2025-0001",
            "2025-0002",
            "2025-0003",
            "2025-0004",
            "2025-0005",
        ]);
    });
});
