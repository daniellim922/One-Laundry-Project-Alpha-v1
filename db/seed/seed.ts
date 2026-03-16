import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { workerTable, type InsertWorker } from "@/db/tables/payroll/workerTable";
import {
    employmentTable,
    type InsertEmployment,
} from "@/db/tables/payroll/employmentTable";
import {
    timesheetTable,
    type InsertTimesheet,
} from "@/db/tables/payroll/timesheetTable";
import {
    advanceTable,
    type InsertAdvance,
} from "@/db/tables/payroll/advanceTable";
import {
    payrollTable,
    type InsertPayroll,
} from "@/db/tables/payroll/payrollTable";
import { payrollTimesheetTable } from "@/db/tables/payroll/payrollTimesheetTable";
import { featuresTable } from "../tables/auth/featuresTable";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { rolePermissionsTable } from "@/db/tables/auth/rolePermissionsTable";
import { workers } from "./workers";
import { FEATURES, ROLES, ROLE_PERMISSIONS } from "./iam";
import { seedAdminUser } from "./auth";

type SplitWorkerSeed = {
    employment: InsertEmployment;
    worker: Omit<InsertWorker, "employmentId">;
};

function splitWorkerSeed(seed: any): SplitWorkerSeed {
    const employmentType =
        seed.employmentType ??
        seed.type ??
        (seed.hourlyPay ? "Part Time" : "Full Time");
    const employmentArrangement =
        seed.employmentArrangement ??
        seed.arrangement ??
        (seed.countryOfOrigin === "Singapore" ? "Local Worker" : "Foreign Worker");

    const employment: InsertEmployment = {
        employmentType,
        employmentArrangement,
        monthlyPay: seed.monthlyPay ?? null,
        workingHours: seed.workingHours ?? null,
        hourlyPay: seed.hourlyPay ?? null,
        restDayPay: seed.restDayPay ?? null,
        paymentMethod: seed.paymentMethod ?? null,
        payNowPhone: seed.payNowPhone ?? null,
        bankAccountNumber: seed.bankAccountNumber ?? null,
    };

    const worker: Omit<InsertWorker, "employmentId"> = {
        name: seed.name,
        email: seed.email ?? null,
        phone: seed.phone ?? null,
        status: seed.status ?? "Active",
        countryOfOrigin: seed.countryOfOrigin ?? null,
        race: seed.race ?? null,
    };

    return { employment, worker };
}

function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
}

function toDateOnlyString(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function startOfPreviousMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function endOfPreviousMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0);
}

async function seed() {
    // Normalize workers into employment + worker props
    const split = workers.map(splitWorkerSeed);
    const employmentInserts = split.map((s) => s.employment);

    const insertedEmployments = await db
        .insert(employmentTable)
        .values(employmentInserts)
        .returning();

    const workerInserts: InsertWorker[] = split.map((s, index) => ({
        ...s.worker,
        employmentId: insertedEmployments[index].id,
    }));

    const insertedWorkers = await db
        .insert(workerTable)
        .values(workerInserts)
        .returning();
    console.log("New workers and employments created!");

    // Minimal timesheet data for first few workers
    const demoWorkers = insertedWorkers.slice(0, 3);
    const timesheetInserts: InsertTimesheet[] = demoWorkers.flatMap((w, index) => {
        const dayOffset = index + 1;
        return [
            {
                dateIn: toDateOnlyString(daysAgo(dayOffset + 1)),
                timeIn: "09:00:00",
                dateOut: toDateOnlyString(daysAgo(dayOffset + 1)),
                timeOut: "18:00:00",
                workerId: w.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                dateIn: toDateOnlyString(daysAgo(dayOffset)),
                timeIn: "10:00:00",
                dateOut: toDateOnlyString(daysAgo(dayOffset)),
                timeOut: "19:00:00",
                workerId: w.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    });

    const insertedTimesheets = await db
        .insert(timesheetTable)
        .values(timesheetInserts)
        .returning();
    console.log("Demo timesheets created!");

    // Minimal advances for first two workers
    const advanceWorkers = insertedWorkers.slice(0, 2);
    const advanceInserts: InsertAdvance[] = advanceWorkers.flatMap((w, index) => [
        {
            amount: 200 + index * 50,
            status: "loan" as const,
            loanDate: toDateOnlyString(daysAgo(10 + index)),
            repaymentDate: toDateOnlyString(daysAgo(5)),
            workerId: w.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            amount: 150 + index * 50,
            status: "paid" as const,
            loanDate: toDateOnlyString(daysAgo(20 + index)),
            repaymentDate: toDateOnlyString(daysAgo(2)),
            workerId: w.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ]);

    const insertedAdvances = await db
        .insert(advanceTable)
        .values(advanceInserts)
        .returning();
    console.log("Demo advances created!", insertedAdvances.length);

    // Minimal payroll data for first two workers
    const payrollWorkers = insertedWorkers.slice(0, 2);
    const periodStart = startOfPreviousMonth();
    const periodEnd = endOfPreviousMonth();

    const payrollInserts: InsertPayroll[] = payrollWorkers.map((w, index) => {
        const employment = insertedEmployments[index];
        const totalHours = 160 + index * 5;
        const overtimeHours = 8 + index * 2;
        const restDays = 4;
        const baseMonthly = employment.monthlyPay ?? 0;
        const hourly = employment.hourlyPay ?? 0;
        const computedTotal =
            baseMonthly || Math.round((totalHours + overtimeHours) * hourly);

        return {
            periodStart: toDateOnlyString(periodStart),
            periodEnd: toDateOnlyString(periodEnd),
            payrollDate: toDateOnlyString(daysAgo(1)),
            totalHours,
            overtimeHours,
            restDays,
            totalPay: computedTotal,
            status: index === 0 ? "approved" : "paid",
            workerId: w.id,
            employmentId: employment.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    });

    const insertedPayrolls = await db
        .insert(payrollTable)
        .values(payrollInserts)
        .returning();
    console.log("Demo payrolls created!");

    // Link payrolls to timesheets for the same workers
    const timesheetsByWorker = new Map<
        string,
        (typeof insertedTimesheets)[number][]
    >();
    for (const t of insertedTimesheets) {
        const arr = timesheetsByWorker.get(t.workerId) ?? [];
        arr.push(t);
        timesheetsByWorker.set(t.workerId, arr);
    }

    const payrollTimesheetInserts = insertedPayrolls.flatMap((p) => {
        const workerTimesheets = timesheetsByWorker.get(p.workerId) ?? [];
        return workerTimesheets.slice(0, 2).map((t) => ({
            payrollId: p.id,
            timesheetId: t.id,
        }));
    });

    if (payrollTimesheetInserts.length > 0) {
        await db.insert(payrollTimesheetTable).values(payrollTimesheetInserts);
    }
    console.log("Demo payroll-timesheet links created!");

    // Seed IAM roles, features, permissions, and admin user
    await db.insert(rolesTable).values(ROLES);
    console.log("New roles created!");
    await db.insert(featuresTable).values(FEATURES);
    console.log("New features created!");

    for (const rolePermission of ROLE_PERMISSIONS) {
        const roleId = await db
            .select({ id: rolesTable.id })
            .from(rolesTable)
            .where(eq(rolesTable.name, rolePermission.role));
        for (const feature of rolePermission.features) {
            const featureId = await db
                .select({ id: featuresTable.id })
                .from(featuresTable)
                .where(eq(featuresTable.name, feature.featureName))
                .limit(1);
            if (featureId.length > 0) {
                await db.insert(rolePermissionsTable).values({
                    roleId: roleId[0].id,
                    featureId: featureId[0].id,
                    create: feature.create,
                    read: feature.read,
                    update: feature.update,
                    delete: feature.delete,
                });
            }
        }
    }
    console.log("New role permissions created!");

    const seededAdmin = await seedAdminUser();
    console.log(
        `Seeded admin user: ${seededAdmin.email} (username: ${seededAdmin.username}) linked to roleId ${seededAdmin.roleId}`,
    );
    process.exit(0);
}
seed();
