"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { payrollsTable } from "@/db/tables/payrollsTable";
import { timesheetEntriesTable } from "@/db/tables/timesheetEntriesTable";
import { workersTable } from "@/db/tables/workersTable";
import {
    calculateHoursFromTimes,
    calculatePay,
} from "@/lib/payroll-utils";

function isoNow(): Date {
    return new Date();
}

function toDateString(val: string): string {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

export async function createPayroll(formData: FormData) {
    const workerId = formData.get("workerId") as string;
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (!workerId || !periodStart || !periodEnd || !payrollDate) {
        return { error: "Missing required fields" };
    }

    const [worker] = await db
        .select()
        .from(workersTable)
        .where(eq(workersTable.id, workerId))
        .limit(1);

    if (!worker) {
        return { error: "Worker not found" };
    }

    const entries = await db
        .select()
        .from(timesheetEntriesTable)
        .where(
            and(
                eq(timesheetEntriesTable.workerId, workerId),
                gte(timesheetEntriesTable.date, periodStart),
                lte(timesheetEntriesTable.date, periodEnd),
            ),
        );

    const dailyHours: number[] = [];
    let totalHours = 0;
    for (const e of entries) {
        const hours = calculateHoursFromTimes(
            String(e.timeIn),
            String(e.timeOut),
        );
        dailyHours.push(hours);
        totalHours += hours;
    }

    const payCalc = calculatePay(
        totalHours,
        dailyHours,
        worker.monthlyPay,
        worker.hourlyPay,
    );

    await db.insert(payrollsTable).values({
        workerId,
        periodStart,
        periodEnd,
        payrollDate,
        totalHours,
        totalPay: payCalc.totalPay,
        status: "draft",
        createdAt: isoNow(),
        updatedAt: isoNow(),
    });

    revalidatePath("/dashboard/payroll");
    return { success: true };
}
