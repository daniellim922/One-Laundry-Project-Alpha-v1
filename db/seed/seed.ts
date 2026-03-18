import { db } from "@/lib/db";
import { calculateHoursFromDateTimes } from "@/lib/payroll-utils";
import { eq } from "drizzle-orm";
import {
    workerTable,
    type InsertWorker,
} from "@/db/tables/payroll/workerTable";
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
import { featuresTable } from "../tables/auth/featuresTable";
import { rolesTable } from "@/db/tables/auth/rolesTable";
import { rolePermissionsTable } from "@/db/tables/auth/rolePermissionsTable";
import { workers } from "./workers";
import { timesheets } from "./timesheet";
import { advances } from "./advances";
import { payrolls } from "./payrolls";
import { FEATURES, ROLES, ROLE_PERMISSIONS } from "./iam";
import { seedAdminUser } from "./auth";

type SplitWorkerSeed = {
    employment: InsertEmployment;
    worker: Omit<InsertWorker, "employmentId">;
};

function splitWorkerSeed(seed: any): SplitWorkerSeed {
    const employment: InsertEmployment = {
        employmentType: seed.employmentType ?? null,
        employmentArrangement: seed.employmentArrangement ?? null,
        cpf: seed.cpf ?? null,
        monthlyPay: seed.monthlyPay ?? null,
        minimumWorkingHours: seed.minimumWorkingHours ?? null,
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

async function seedTimesheets(
    insertedWorkers: { id: string }[],
): Promise<void> {
    const now = new Date();
    const timesheetInserts: InsertTimesheet[] = timesheets.map((t) => ({
        workerId: insertedWorkers[t.workerIndex]!.id,
        dateIn: t.dateIn,
        timeIn: t.timeIn,
        dateOut: t.dateOut,
        timeOut: t.timeOut,
        hours: t.hours,
        createdAt: now,
        updatedAt: now,
    }));
    await db.insert(timesheetTable).values(timesheetInserts);
}

async function seedAdvances(
    insertedWorkers: { id: string }[],
): Promise<void> {
    const now = new Date();
    const advanceInserts: InsertAdvance[] = advances.map((a) => ({
        workerId: insertedWorkers[a.workerIndex]!.id,
        amount: a.amount,
        status: a.status,
        loanDate: a.loanDate,
        repaymentDate: a.repaymentDate,
        createdAt: now,
        updatedAt: now,
    }));
    await db.insert(advanceTable).values(advanceInserts);
}

async function seedPayrolls(
    insertedWorkers: { id: string }[],
): Promise<void> {
    const now = new Date();
    const payrollInserts: InsertPayroll[] = payrolls.map((p) => ({
        workerId: insertedWorkers[p.workerIndex]!.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        payrollDate: p.payrollDate,
        totalHours: p.totalHours,
        overtimeHours: p.overtimeHours,
        restDays: p.restDays,
        cpf: p.cpf,
        totalPay: p.totalPay,
        status: p.status,
        createdAt: now,
        updatedAt: now,
    }));
    await db.insert(payrollTable).values(payrollInserts);
}

async function seedRolePermissions(): Promise<void> {
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

    await seedTimesheets(insertedWorkers);
    console.log("New timesheet entries created!");

    await seedAdvances(insertedWorkers);
    console.log("New advance entries created!");

    await seedPayrolls(insertedWorkers);
    console.log("New payroll entries created!");

    // Seed IAM roles, features, permissions, and admin user
    await db.insert(rolesTable).values(ROLES);
    console.log("New roles created!");
    await db.insert(featuresTable).values(FEATURES);
    console.log("New features created!");
    await seedRolePermissions();
    console.log("New role permissions created!");

    const seededAdmin = await seedAdminUser();
    console.log(
        `Seeded admin user: ${seededAdmin.email} (username: ${seededAdmin.username}) linked to roleId ${seededAdmin.roleId}`,
    );
    process.exit(0);
}
seed();
