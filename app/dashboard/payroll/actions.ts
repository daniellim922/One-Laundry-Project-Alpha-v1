"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { calculatePay, type PayCalcInput } from "@/lib/payroll-utils";

function isoNow(): Date {
    return new Date();
}

function generateVoucherNumber(): number {
    return parseInt(crypto.randomUUID().slice(0, 8), 16);
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
            employment: employmentTable,
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

    const totalHoursWorked = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays: 0,
    });

    const now = isoNow();

    const [voucher] = await db
        .insert(payrollVoucherTable)
        .values({
            voucherNumber: generateVoucherNumber(),
            employmentType: employment.employmentType,
            employmentArrangement: employment.employmentArrangement,
            monthlyPay: employment.monthlyPay,
            minimumWorkingHours: employment.minimumWorkingHours,
            totalHoursWorked,
            overtimeHours: payCalc.overtimeHours,
            hourlyRate: employment.hourlyRate,
            overtimePay: payCalc.overtimePay,
            restDays: 0,
            restDayRate: employment.restDayRate,
            restDayPay: payCalc.restDayPay,
            cpf: employment.cpf,
            totalPay: payCalc.totalPay,
            paymentMethod: employment.paymentMethod,
            payNowPhone: employment.payNowPhone,
            bankAccountNumber: employment.bankAccountNumber,
            createdAt: now,
            updatedAt: now,
        })
        .returning({ id: payrollVoucherTable.id });

    await db.insert(payrollTable).values({
        workerId,
        payrollVoucherId: voucher!.id,
        periodStart,
        periodEnd,
        payrollDate,
        status: "draft",
        createdAt: now,
        updatedAt: now,
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
                employment: employmentTable,
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

        const totalHoursWorked = entries.reduce((sum, e) => sum + Number(e.hours), 0);
        const payCalc = calculatePay({
            employmentType: employment.employmentType,
            totalHoursWorked,
            minimumWorkingHours: employment.minimumWorkingHours,
            monthlyPay: employment.monthlyPay,
            hourlyRate: employment.hourlyRate,
            restDayRate: employment.restDayRate,
            restDays: 0,
        });

        const now = isoNow();

        const [voucher] = await db
            .insert(payrollVoucherTable)
            .values({
                voucherNumber: generateVoucherNumber(),
                employmentType: employment.employmentType,
                employmentArrangement: employment.employmentArrangement,
                monthlyPay: employment.monthlyPay,
                minimumWorkingHours: employment.minimumWorkingHours,
                totalHoursWorked,
                overtimeHours: payCalc.overtimeHours,
                hourlyRate: employment.hourlyRate,
                overtimePay: payCalc.overtimePay,
                restDays: 0,
                restDayRate: employment.restDayRate,
                restDayPay: payCalc.restDayPay,
                cpf: employment.cpf,
                totalPay: payCalc.totalPay,
                paymentMethod: employment.paymentMethod,
                payNowPhone: employment.payNowPhone,
                bankAccountNumber: employment.bankAccountNumber,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: payrollVoucherTable.id });

        await db.insert(payrollTable).values({
            workerId,
            payrollVoucherId: voucher!.id,
            periodStart,
            periodEnd,
            payrollDate,
            status: "draft",
            createdAt: now,
            updatedAt: now,
        });
        created++;
    }

    revalidatePath("/dashboard/payroll");
    return { success: true, created };
}

export async function updatePayroll(payrollId: string, formData: FormData) {
    const periodStart = toDateString(formData.get("periodStart") as string);
    const periodEnd = toDateString(formData.get("periodEnd") as string);
    const payrollDate = toDateString(formData.get("payrollDate") as string);

    if (!periodStart || !periodEnd || !payrollDate) {
        return { error: "Missing required fields" };
    }

    const [existing] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!existing) return { error: "Payroll not found" };
    if (existing.status !== "draft") return { error: "Only draft payrolls can be edited" };

    const [row] = await db
        .select({
            worker: workerTable,
            employment: employmentTable,
        })
        .from(workerTable)
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .where(eq(workerTable.id, existing.workerId))
        .limit(1);

    if (!row) return { error: "Worker not found" };
    const { employment } = row;

    const entries = await db
        .select()
        .from(timesheetTable)
        .where(
            and(
                eq(timesheetTable.workerId, existing.workerId),
                gte(timesheetTable.dateIn, periodStart),
                lte(timesheetTable.dateOut, periodEnd),
            ),
        );

    const totalHoursWorked = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays: 0,
    });

    const now = isoNow();

    await db
        .update(payrollTable)
        .set({
            periodStart,
            periodEnd,
            payrollDate,
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payrollId));

    await db
        .update(payrollVoucherTable)
        .set({
            employmentType: employment.employmentType,
            employmentArrangement: employment.employmentArrangement,
            monthlyPay: employment.monthlyPay,
            minimumWorkingHours: employment.minimumWorkingHours,
            totalHoursWorked,
            overtimeHours: payCalc.overtimeHours,
            hourlyRate: employment.hourlyRate,
            overtimePay: payCalc.overtimePay,
            restDayRate: employment.restDayRate,
            restDayPay: payCalc.restDayPay,
            cpf: employment.cpf,
            totalPay: payCalc.totalPay,
            paymentMethod: employment.paymentMethod,
            payNowPhone: employment.payNowPhone,
            bankAccountNumber: employment.bankAccountNumber,
            updatedAt: now,
        })
        .where(eq(payrollVoucherTable.id, existing.payrollVoucherId));

    revalidatePath(`/dashboard/payroll/${payrollId}`);
    revalidatePath("/dashboard/payroll");
    return { success: true };
}

export async function recalculateVouchersForWorker(workerId: string) {
    const drafts = await db
        .select()
        .from(payrollTable)
        .where(
            and(
                eq(payrollTable.workerId, workerId),
                eq(payrollTable.status, "draft"),
            ),
        );

    if (drafts.length === 0) return;

    const [row] = await db
        .select({ employment: employmentTable })
        .from(workerTable)
        .innerJoin(
            employmentTable,
            eq(workerTable.employmentId, employmentTable.id),
        )
        .where(eq(workerTable.id, workerId))
        .limit(1);
    if (!row) return;
    const { employment } = row;

    for (const payroll of drafts) {
        const entries = await db
            .select()
            .from(timesheetTable)
            .where(
                and(
                    eq(timesheetTable.workerId, workerId),
                    gte(timesheetTable.dateIn, payroll.periodStart),
                    lte(timesheetTable.dateOut, payroll.periodEnd),
                ),
            );
        const totalHoursWorked = entries.reduce(
            (sum, e) => sum + Number(e.hours),
            0,
        );

        const [currentVoucher] = await db
            .select({ restDays: payrollVoucherTable.restDays })
            .from(payrollVoucherTable)
            .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId))
            .limit(1);

        const payCalc = calculatePay({
            employmentType: employment.employmentType,
            totalHoursWorked,
            minimumWorkingHours: employment.minimumWorkingHours,
            monthlyPay: employment.monthlyPay,
            hourlyRate: employment.hourlyRate,
            restDayRate: employment.restDayRate,
            restDays: currentVoucher?.restDays ?? 0,
        });

        await db
            .update(payrollVoucherTable)
            .set({
                totalHoursWorked,
                overtimeHours: payCalc.overtimeHours,
                overtimePay: payCalc.overtimePay,
                restDayPay: payCalc.restDayPay,
                totalPay: payCalc.totalPay,
                updatedAt: new Date(),
            })
            .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId));
    }
}
