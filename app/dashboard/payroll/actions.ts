"use server";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getAdvancesForPayrollPeriod } from "@/lib/advances-queries";
import { db } from "@/lib/db";
import { payrollTable } from "@/db/tables/payroll/payrollTable";
import { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { employmentTable } from "@/db/tables/payroll/employmentTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { calculatePay, type PayCalcInput } from "@/lib/payroll-utils";
import { requirePermission } from "@/lib/require-permission";

function isoNow(): Date {
    return new Date();
}

function generateVoucherNumber(): number {
    return parseInt(crypto.randomUUID().slice(0, 8), 16);
}

function roundHours(n: number): number {
    return Math.round(n * 100) / 100;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

function clampHoursNotMet(hoursNotMet: number): number {
    return hoursNotMet > 0 ? 0 : hoursNotMet;
}

function calcHoursNotMetDeduction(args: {
    hoursNotMet: number | null;
    hourlyRate: number | null;
}): number {
    const { hoursNotMet, hourlyRate } = args;
    if (hoursNotMet == null) return 0;
    if (hoursNotMet === 0) return 0;
    return -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0));
}

function calcNetPay(args: {
    totalPay: number;
    cpf: number | null;
    advance?: number | null;
}): number {
    return roundMoney(
        args.totalPay - (args.cpf ?? 0) - (args.advance ?? 0),
    );
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
    const { employment } = row;

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
    const restDays = 4;
    const publicHolidays = 0;
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays,
        publicHolidays,
    });
    const hoursNotMet =
        employment.minimumWorkingHours != null
            ? clampHoursNotMet(roundHours(totalHoursWorked - employment.minimumWorkingHours))
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: employment.hourlyRate,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const advances = await getAdvancesForPayrollPeriod(
        workerId,
        periodStart,
        periodEnd,
    );
    const advanceTotal = advances
        .filter((a) => a.status === "loan")
        .reduce((sum, a) => sum + a.amount, 0);
    const netPay = calcNetPay({
        totalPay,
        cpf: employment.cpf,
        advance: advanceTotal,
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
            hoursNotMet,
            hoursNotMetDeduction,
            overtimeHours: payCalc.overtimeHours,
            hourlyRate: employment.hourlyRate,
            overtimePay: payCalc.overtimePay,
            restDays,
            restDayRate: employment.restDayRate,
            restDayPay: payCalc.restDayPay,
            publicHolidays,
            publicHolidayPay: payCalc.publicHolidayPay,
            cpf: employment.cpf,
            advance: advanceTotal,
            totalPay,
            netPay,
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
    revalidatePath("/dashboard/payroll/all");
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
        const { employment } = row;

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
        const restDays = 4;
        const publicHolidays = 0;
        const payCalc = calculatePay({
            employmentType: employment.employmentType,
            totalHoursWorked,
            minimumWorkingHours: employment.minimumWorkingHours,
            monthlyPay: employment.monthlyPay,
            hourlyRate: employment.hourlyRate,
            restDayRate: employment.restDayRate,
            restDays,
            publicHolidays,
        });
        const hoursNotMet =
            employment.minimumWorkingHours != null
                ? clampHoursNotMet(roundHours(totalHoursWorked - employment.minimumWorkingHours))
                : null;
        const hoursNotMetDeduction = calcHoursNotMetDeduction({
            hoursNotMet,
            hourlyRate: employment.hourlyRate,
        });
        const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
        const advances = await getAdvancesForPayrollPeriod(
            workerId,
            periodStart,
            periodEnd,
        );
        const advanceTotal = advances
            .filter((a) => a.status === "loan")
            .reduce((sum, a) => sum + a.amount, 0);
        const netPay = calcNetPay({
            totalPay,
            cpf: employment.cpf,
            advance: advanceTotal,
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
                hoursNotMet,
                hoursNotMetDeduction,
                overtimeHours: payCalc.overtimeHours,
                hourlyRate: employment.hourlyRate,
                overtimePay: payCalc.overtimePay,
                restDays,
                restDayRate: employment.restDayRate,
                restDayPay: payCalc.restDayPay,
                publicHolidays,
                publicHolidayPay: payCalc.publicHolidayPay,
                cpf: employment.cpf,
                advance: advanceTotal,
                totalPay,
                netPay,
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
    revalidatePath("/dashboard/payroll/all");
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
    const [currentVoucher] = await db
        .select({
            restDays: payrollVoucherTable.restDays,
            publicHolidays: payrollVoucherTable.publicHolidays,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, existing.payrollVoucherId))
        .limit(1);

    const restDays = currentVoucher?.restDays ?? 0;
    const publicHolidays = currentVoucher?.publicHolidays ?? 0;
    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays,
        publicHolidays,
    });
    const hoursNotMet =
        employment.minimumWorkingHours != null
            ? clampHoursNotMet(roundHours(totalHoursWorked - employment.minimumWorkingHours))
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: employment.hourlyRate,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const advances = await getAdvancesForPayrollPeriod(
        existing.workerId,
        periodStart,
        periodEnd,
    );
    const advanceTotal = advances
        .filter((a) => a.status === "loan")
        .reduce((sum, a) => sum + a.amount, 0);
    const netPay = calcNetPay({
        totalPay,
        cpf: employment.cpf,
        advance: advanceTotal,
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
            hoursNotMet,
            hoursNotMetDeduction,
            overtimeHours: payCalc.overtimeHours,
            hourlyRate: employment.hourlyRate,
            overtimePay: payCalc.overtimePay,
            restDayRate: employment.restDayRate,
            restDayPay: payCalc.restDayPay,
            publicHolidayPay: payCalc.publicHolidayPay,
            cpf: employment.cpf,
            advance: advanceTotal,
            totalPay,
            netPay,
            paymentMethod: employment.paymentMethod,
            payNowPhone: employment.payNowPhone,
            bankAccountNumber: employment.bankAccountNumber,
            updatedAt: now,
        })
        .where(eq(payrollVoucherTable.id, existing.payrollVoucherId));

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

async function settlePayrollInTx(
    tx: any,
    payroll: {
        id: string;
        workerId: string;
        periodStart: string;
        periodEnd: string;
    },
    now: Date,
) {
    type AdvanceInPeriodRow = {
        id: string;
        advanceRequestId: string;
        status: "loan" | "paid";
    };
    type RequestAdvanceRow = {
        advanceRequestId: string;
        status: "loan" | "paid";
    };

    await tx
        .update(payrollTable)
        .set({
            status: "settled",
            updatedAt: now,
        })
        .where(eq(payrollTable.id, payroll.id));

    const advancesInPeriod: AdvanceInPeriodRow[] = await tx
        .select({
            id: advanceTable.id,
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(
            and(
                eq(advanceRequestTable.workerId, payroll.workerId),
                gte(advanceTable.repaymentDate, payroll.periodStart),
                lte(advanceTable.repaymentDate, payroll.periodEnd),
            ),
        );

    const loanAdvanceIds = advancesInPeriod
        .filter((advance) => advance.status === "loan")
        .map((advance) => advance.id);

    if (loanAdvanceIds.length > 0) {
        await tx
            .update(advanceTable)
            .set({
                status: "paid",
                updatedAt: now,
            })
            .where(inArray(advanceTable.id, loanAdvanceIds));
    }

    const requestIds: string[] = Array.from(
        new Set(advancesInPeriod.map((advance) => advance.advanceRequestId)),
    );

    if (requestIds.length > 0) {
        const requestAdvances: RequestAdvanceRow[] = await tx
            .select({
                advanceRequestId: advanceTable.advanceRequestId,
                status: advanceTable.status,
            })
            .from(advanceTable)
            .where(inArray(advanceTable.advanceRequestId, requestIds));

        const byRequestId = requestAdvances.reduce((acc, row) => {
            if (!acc[row.advanceRequestId]) acc[row.advanceRequestId] = [];
            acc[row.advanceRequestId]!.push({ status: row.status });
            return acc;
        }, {} as Record<string, Array<{ status: "loan" | "paid" }>>);

        const fullyPaidRequestIds = requestIds.filter((requestId: string) => {
            const advances = byRequestId[requestId] ?? [];
            return advances.length > 0 && advances.every((a) => a.status === "paid");
        });

        const notFullyPaidRequestIds = requestIds.filter(
            (requestId: string) => !fullyPaidRequestIds.includes(requestId),
        );

        if (fullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "paid",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, fullyPaidRequestIds));
        }

        if (notFullyPaidRequestIds.length > 0) {
            await tx
                .update(advanceRequestTable)
                .set({
                    status: "loan",
                    updatedAt: now,
                })
                .where(inArray(advanceRequestTable.id, notFullyPaidRequestIds));
        }
    }

    await tx
        .update(timesheetTable)
        .set({
            status: "paid",
            updatedAt: now,
        })
        .where(
            and(
                eq(timesheetTable.workerId, payroll.workerId),
                gte(timesheetTable.dateIn, payroll.periodStart),
                lte(timesheetTable.dateOut, payroll.periodEnd),
                eq(timesheetTable.status, "unpaid"),
            ),
        );
}

export async function settlePayroll(payrollId: string) {
    await requirePermission("Payroll", "update");

    const [payroll] = await db
        .select()
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payroll) return { error: "Payroll not found" };
    if (payroll.status !== "draft") {
        return { error: "Only draft payrolls can be settled" };
    }

    const now = isoNow();

    try {
        await db.transaction(async (tx) => {
            await settlePayrollInTx(tx, payroll, now);
        });
    } catch (error) {
        console.error("Error settling payroll", error);
        return { error: "Failed to settle payroll" };
    }

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    return { success: true };
}

export async function settleAllDraftPayrolls() {
    await requirePermission("Payroll", "update");

    const now = isoNow();

    let settledPayrollIds: string[] = [];
    try {
        settledPayrollIds = await db.transaction(async (tx) => {
            const drafts = await tx
                .select()
                .from(payrollTable)
                .where(eq(payrollTable.status, "draft"));

            for (const payroll of drafts) {
                await settlePayrollInTx(tx, payroll, now);
            }

            return drafts.map((p) => p.id);
        });
    } catch (error) {
        console.error("Error settling all draft payrolls", error);
        return { error: "Failed to settle draft payrolls" };
    }

    for (const payrollId of settledPayrollIds) {
        revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
        revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    }

    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    revalidatePath("/dashboard/advance");
    revalidatePath("/dashboard/advance/all");
    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");

    return { success: true, settled: settledPayrollIds.length, settledPayrollIds };
}

export async function getDraftPayrollsForSettlement() {
    await requirePermission("Payroll", "read");

    const rows = await db
        .select({
            payroll: payrollTable,
            workerName: workerTable.name,
            employmentType: employmentTable.employmentType,
            employmentArrangement: employmentTable.employmentArrangement,
        })
        .from(payrollTable)
        .innerJoin(workerTable, eq(payrollTable.workerId, workerTable.id))
        .innerJoin(employmentTable, eq(workerTable.employmentId, employmentTable.id))
        .where(eq(payrollTable.status, "draft"))
        .orderBy(asc(workerTable.name), asc(payrollTable.periodStart));

    return rows.map((r) => ({
        ...r.payroll,
        workerName: r.workerName,
        employmentType: r.employmentType,
        employmentArrangement: r.employmentArrangement,
    }));
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
            .select({
                restDays: payrollVoucherTable.restDays,
                publicHolidays: payrollVoucherTable.publicHolidays,
            })
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
            publicHolidays: currentVoucher?.publicHolidays ?? 0,
        });
        const hoursNotMet =
            employment.minimumWorkingHours != null
                ? clampHoursNotMet(roundHours(totalHoursWorked - employment.minimumWorkingHours))
                : null;
        const hoursNotMetDeduction = calcHoursNotMetDeduction({
            hoursNotMet,
            hourlyRate: employment.hourlyRate,
        });
        const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
        const advances = await getAdvancesForPayrollPeriod(
            workerId,
            payroll.periodStart,
            payroll.periodEnd,
        );
        const advanceTotal = advances
            .filter((a) => a.status === "loan")
            .reduce((sum, a) => sum + a.amount, 0);
        const netPay = calcNetPay({
            totalPay,
            cpf: employment.cpf,
            advance: advanceTotal,
        });

        await db
            .update(payrollVoucherTable)
            .set({
                employmentType: employment.employmentType,
                employmentArrangement: employment.employmentArrangement,
                monthlyPay: employment.monthlyPay,
                minimumWorkingHours: employment.minimumWorkingHours,
                totalHoursWorked,
                hoursNotMet,
                hoursNotMetDeduction,
                overtimeHours: payCalc.overtimeHours,
                hourlyRate: employment.hourlyRate,
                overtimePay: payCalc.overtimePay,
                restDayRate: employment.restDayRate,
                restDayPay: payCalc.restDayPay,
                publicHolidayPay: payCalc.publicHolidayPay,
                cpf: employment.cpf,
                advance: advanceTotal,
                totalPay,
                netPay,
                paymentMethod: employment.paymentMethod,
                payNowPhone: employment.payNowPhone,
                bankAccountNumber: employment.bankAccountNumber,
                updatedAt: new Date(),
            })
            .where(eq(payrollVoucherTable.id, payroll.payrollVoucherId));
    }
}

export async function updateVoucherDays(input: {
    payrollId: string;
    voucherId: string;
    restDays: number;
    publicHolidays: number;
}) {
    const { payrollId, voucherId, restDays, publicHolidays } = input;
    if (!voucherId || !payrollId) return { error: "Missing voucherId or payrollId" };
    if (!Number.isFinite(restDays) || restDays < 0) return { error: "Invalid restDays" };
    if (!Number.isFinite(publicHolidays) || publicHolidays < 0)
        return { error: "Invalid publicHolidays" };

    const [payrollRow] = await db
        .select({
            status: payrollTable.status,
            payrollVoucherId: payrollTable.payrollVoucherId,
        })
        .from(payrollTable)
        .where(eq(payrollTable.id, payrollId))
        .limit(1);

    if (!payrollRow) return { error: "Payroll not found" };
    if (payrollRow.payrollVoucherId !== voucherId) {
        return { error: "Voucher does not belong to this payroll" };
    }
    if (payrollRow.status !== "draft") {
        return { error: "Only draft payrolls can edit voucher days" };
    }

    const [voucher] = await db
        .select({
            employmentType: payrollVoucherTable.employmentType,
            totalHoursWorked: payrollVoucherTable.totalHoursWorked,
            minimumWorkingHours: payrollVoucherTable.minimumWorkingHours,
            monthlyPay: payrollVoucherTable.monthlyPay,
            hourlyRate: payrollVoucherTable.hourlyRate,
            restDayRate: payrollVoucherTable.restDayRate,
            cpf: payrollVoucherTable.cpf,
            advance: payrollVoucherTable.advance,
        })
        .from(payrollVoucherTable)
        .where(eq(payrollVoucherTable.id, voucherId))
        .limit(1);

    if (!voucher) return { error: "Voucher not found" };

    const totalHoursWorked = Number(voucher.totalHoursWorked ?? 0);
    const minimumWorkingHours =
        voucher.minimumWorkingHours != null ? Number(voucher.minimumWorkingHours) : null;

    const payCalc = calculatePay({
        employmentType: (voucher.employmentType ?? "Full Time") as PayCalcInput["employmentType"],
        totalHoursWorked,
        minimumWorkingHours,
        monthlyPay: voucher.monthlyPay != null ? Number(voucher.monthlyPay) : null,
        hourlyRate: voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
        restDayRate: voucher.restDayRate != null ? Number(voucher.restDayRate) : null,
        restDays,
        publicHolidays,
    });

    const hoursNotMet =
        minimumWorkingHours != null
            ? clampHoursNotMet(roundHours(totalHoursWorked - minimumWorkingHours))
            : null;
    const hoursNotMetDeduction = calcHoursNotMetDeduction({
        hoursNotMet,
        hourlyRate: voucher.hourlyRate != null ? Number(voucher.hourlyRate) : null,
    });
    const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);
    const netPay = calcNetPay({
        totalPay,
        cpf: voucher.cpf != null ? Number(voucher.cpf) : null,
        advance: voucher.advance,
    });

    await db
        .update(payrollVoucherTable)
        .set({
            restDays,
            publicHolidays,
            hoursNotMet,
            hoursNotMetDeduction,
            overtimeHours: payCalc.overtimeHours,
            overtimePay: payCalc.overtimePay,
            restDayPay: payCalc.restDayPay,
            publicHolidayPay: payCalc.publicHolidayPay,
            totalPay,
            netPay,
            updatedAt: isoNow(),
        })
        .where(eq(payrollVoucherTable.id, voucherId));

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}
