"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { calculatePay } from "@/lib/payroll-utils";

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

    const [row] = await db
        .select({
            worker: workerTable,
            employment: {
                monthlyPay: employmentTable.monthlyPay,
                hourlyPay: employmentTable.hourlyPay,
            },
        })
        .from(workerTable)
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .where(eq(workerTable.id, workerId))
        .limit(1);

    if (!row) {
        return { error: "Worker not found" };
    }
    const { worker, employment } = row;

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

    const dailyHours = entries.map((e) => Number(e.hours));
    const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);
    let overtimeHours = 0;
    for (const h of dailyHours) {
        if (h > 8) overtimeHours += h - 8;
    }
    const restDays = 0;

    const payCalc = calculatePay(
        totalHours,
        dailyHours,
        employment.monthlyPay,
        employment.hourlyPay,
    );

    await db.insert(payrollTable).values({
        workerId,
        employmentId: worker.employmentId,
        periodStart,
        periodEnd,
        payrollDate,
        totalHours,
        overtimeHours,
        restDays,
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

        const [row] = await db
            .select({
                worker: workerTable,
                employment: {
                    monthlyPay: employmentTable.monthlyPay,
                    hourlyPay: employmentTable.hourlyPay,
                },
            })
            .from(workerTable)
            .innerJoin(
                employmentTable,
                eq(workerTable.employmentId, employmentTable.id),
            )
            .where(eq(workerTable.id, workerId))
            .limit(1);

        if (!row) continue;
        const { worker, employment } = row;

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

        const dailyHours = entries.map((e) => Number(e.hours));
        const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);
        let overtimeHours = 0;
        for (const h of dailyHours) {
            if (h > 8) overtimeHours += h - 8;
        }
        const restDays = 0;

        const payCalc = calculatePay(
            totalHours,
            dailyHours,
            employment.monthlyPay,
            employment.hourlyPay,
        );

        await db.insert(payrollTable).values({
            workerId,
            employmentId: worker.employmentId,
            periodStart,
            periodEnd,
            payrollDate,
            totalHours,
            overtimeHours,
            restDays,
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
