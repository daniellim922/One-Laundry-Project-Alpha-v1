"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { calculateHoursFromTimes, calculatePay } from "@/lib/payroll-utils";

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
        .from(workerTable)
        .where(eq(workerTable.id, workerId))
        .limit(1);

    if (!worker) {
        return { error: "Worker not found" };
    }

    const entries = await db
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, workerId),
                gte(timesheetTable.dateIn, periodStart),
                lte(timesheetTable.dateOut, periodEnd),
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
        worker.employment.monthlyPay,
        worker.employment.hourlyPay,
    );

    await db.insert(payrollTable).values({
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

export async function createPayrolls(formData: FormData) {
    const workerIds = formData.getAll("workerId") as string[];
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (workerIds.length === 0 || !periodStart || !periodEnd || !payrollDate) {
        return { error: "Select at least one worker and fill in period dates" };
    }

    let created = 0;
    for (const workerId of workerIds) {
        if (!workerId) continue;

        const [worker] = await db
            .select()
            .from(workerTable)
            .where(eq(workerTable.id, workerId))
            .limit(1);

        if (!worker) continue;

        const entries = await db
            .select()
            .from(timesheetTable)
            .where(
                and(
                    eq(timesheetTable.workerId, workerId),
                    gte(timesheetTable.dateIn, periodStart),
                    lte(timesheetTable.dateOut, periodEnd),
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
            worker.employment.monthlyPay,
            worker.employment.hourlyPay,
        );

        await db.insert(payrollTable).values({
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
        created++;
    }

    revalidatePath("/dashboard/payroll");
    return { success: true, created };
}
