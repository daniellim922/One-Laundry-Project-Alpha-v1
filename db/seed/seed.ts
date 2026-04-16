import "dotenv/config";
import { db } from "@/lib/db";
import {
    workerTable,
    type InsertWorker,
} from "@/db/tables/workerTable";
import {
    employmentTable,
    type InsertEmployment,
} from "@/db/tables/employmentTable";
import {
    timesheetTable,
    type InsertTimesheet,
} from "@/db/tables/timesheetTable";
import {
    advanceRequestTable,
    type InsertAdvanceRequest,
} from "@/db/tables/advanceRequestTable";
import {
    advanceTable,
    type InsertAdvance,
} from "@/db/tables/advanceTable";
import {
    payrollTable,
    type InsertPayroll,
} from "@/db/tables/payrollTable";
import {
    payrollVoucherTable,
    type InsertPayrollVoucher,
} from "@/db/tables/payrollVoucherTable";
import { workers } from "@/db/seed/workers";
import { timesheets } from "./timesheet";
import { advances } from "./advances";
import { payrolls } from "./payrolls";
import { SEED_TIMESTAMP } from "./constants";

type SplitWorkerSeed = {
    employment: InsertEmployment;
    worker: Omit<InsertWorker, "employmentId">;
};

type WorkerSeed = (typeof workers)[number] &
    Partial<{
        cpf: number;
        monthlyPay: number;
        minimumWorkingHours: number;
        hourlyRate: number;
        restDayRate: number;
        paymentMethod: string;
        payNowPhone: string;
        bankAccountNumber: string;
        nric: string;
        email: string;
        phone: string;
        countryOfOrigin: string;
        race: string;
        employmentType: string;
        employmentArrangement: string;
        status: string;
    }>;

function splitWorkerSeed(seed: WorkerSeed): SplitWorkerSeed {
    const employment: InsertEmployment = {
        employmentType: seed.employmentType ?? null,
        employmentArrangement: seed.employmentArrangement ?? null,
        cpf: seed.cpf ?? null,
        monthlyPay: seed.monthlyPay ?? null,
        minimumWorkingHours: seed.minimumWorkingHours ?? null,
        hourlyRate: seed.hourlyRate ?? null,
        restDayRate: seed.restDayRate ?? null,
        paymentMethod: seed.paymentMethod ?? null,
        payNowPhone: seed.payNowPhone ?? null,
        bankAccountNumber: seed.bankAccountNumber ?? null,
    };

    const worker: Omit<InsertWorker, "employmentId"> = {
        name: seed.name,
        nric: seed.nric ?? null,
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
    const timesheetInserts: InsertTimesheet[] = timesheets.map((t) => ({
        workerId: insertedWorkers[t.workerIndex]!.id,
        dateIn: t.dateIn,
        timeIn: t.timeIn,
        dateOut: t.dateOut,
        timeOut: t.timeOut,
        hours: t.hours,
        status: t.status,
        createdAt: SEED_TIMESTAMP,
        updatedAt: SEED_TIMESTAMP,
    }));

    const batchSize = 500;
    for (let index = 0; index < timesheetInserts.length; index += batchSize) {
        await db
            .insert(timesheetTable)
            .values(timesheetInserts.slice(index, index + batchSize));
    }
}

async function seedAdvances(
    insertedWorkers: { id: string; name: string }[],
): Promise<void> {
    const workerIdByName = new Map(
        insertedWorkers.map((w) => [w.name.toLowerCase(), w.id] as const),
    );

    for (const a of advances) {
        const workerId = workerIdByName.get(a.workerName.toLowerCase());
        if (!workerId) {
            throw new Error(
                `seedAdvances: worker not found for workerName "${a.workerName}"`,
            );
        }
        const requestInsert: InsertAdvanceRequest = {
            workerId,
            status: a.status,
            requestDate: a.dateRequested,
            amountRequested: a.amount,
            purpose: a.purpose,
            createdAt: SEED_TIMESTAMP,
            updatedAt: SEED_TIMESTAMP,
        };
        const [insertedRequest] = await db
            .insert(advanceRequestTable)
            .values(requestInsert)
            .returning({ id: advanceRequestTable.id });

        const advanceInserts: InsertAdvance[] = a.repaymentTerms.map((t) => ({
            advanceRequestId: insertedRequest!.id,
            amount: t.installmentAmt,
            status: t.status,
            repaymentDate: t.installmentDate,
            createdAt: SEED_TIMESTAMP,
            updatedAt: SEED_TIMESTAMP,
        }));
        await db.insert(advanceTable).values(advanceInserts);
    }
}

async function seedPayrolls(insertedWorkers: { id: string }[]): Promise<void> {
    for (const p of payrolls) {
        const voucherInsert: InsertPayrollVoucher = {
            ...p.voucher,
            createdAt: SEED_TIMESTAMP,
            updatedAt: SEED_TIMESTAMP,
        };
        const [insertedVoucher] = await db
            .insert(payrollVoucherTable)
            .values(voucherInsert)
            .returning({ id: payrollVoucherTable.id });

        const payrollInsert: InsertPayroll = {
            workerId: insertedWorkers[p.workerIndex]!.id,
            payrollVoucherId: insertedVoucher!.id,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            payrollDate: p.payrollDate,
            status: p.status,
            createdAt: SEED_TIMESTAMP,
            updatedAt: SEED_TIMESTAMP,
        };
        await db.insert(payrollTable).values(payrollInsert);
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
    process.exit(0);
}
seed();
