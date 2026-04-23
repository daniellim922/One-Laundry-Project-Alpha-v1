import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { payrollVoucherCounterTable } from "@/db/tables/payrollVoucherCounterTable";

type VoucherCounterExecutor = Pick<typeof db, "insert">;

function formatVoucherNumber(year: number, sequence: number) {
    return `${year}-${String(sequence).padStart(4, "0")}`;
}

export async function generateVoucherNumber(
    year: number,
    executor: VoucherCounterExecutor = db,
) {
    if (!Number.isInteger(year) || year < 0) {
        throw new Error("Voucher year must be a non-negative integer");
    }

    const now = new Date();
    const [counter] = await executor
        .insert(payrollVoucherCounterTable)
        .values({
            year,
            currentValue: 1,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: payrollVoucherCounterTable.year,
            set: {
                currentValue: sql`${payrollVoucherCounterTable.currentValue} + 1`,
                updatedAt: now,
            },
        })
        .returning({
            currentValue: payrollVoucherCounterTable.currentValue,
        });

    if (!counter) {
        throw new Error(`Failed to allocate voucher number for year ${year}`);
    }

    return formatVoucherNumber(year, counter.currentValue);
}
