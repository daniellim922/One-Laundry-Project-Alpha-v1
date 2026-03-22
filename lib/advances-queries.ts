import { desc, eq } from "drizzle-orm";

import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { db } from "@/lib/db";

function normalizePgDate(value: string | Date): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return value;
}

export type AdvanceWithWorker = {
    id: string;
    amount: number;
    status: "loan" | "paid";
    loanDate: string;
    repaymentDate: string | null;
    workerId: string;
    workerName: string;
    createdAt: Date;
    updatedAt: Date;
};

export async function listAdvancesWithWorkers(
    database: typeof db = db,
): Promise<AdvanceWithWorker[]> {
    const rows = await database
        .select({
            id: advanceTable.id,
            amount: advanceTable.amount,
            status: advanceTable.status,
            loanDate: advanceTable.loanDate,
            repaymentDate: advanceTable.repaymentDate,
            workerId: advanceTable.workerId,
            workerName: workerTable.name,
            createdAt: advanceTable.createdAt,
            updatedAt: advanceTable.updatedAt,
        })
        .from(advanceTable)
        .innerJoin(workerTable, eq(advanceTable.workerId, workerTable.id))
        .orderBy(desc(advanceTable.loanDate));

    return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        loanDate: normalizePgDate(r.loanDate),
        repaymentDate:
            r.repaymentDate == null
                ? null
                : normalizePgDate(r.repaymentDate),
        workerId: r.workerId,
        workerName: r.workerName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    }));
}

export async function getAdvanceByIdWithWorker(
    id: string,
    database: typeof db = db,
): Promise<AdvanceWithWorker | null> {
    const rows = await database
        .select({
            id: advanceTable.id,
            amount: advanceTable.amount,
            status: advanceTable.status,
            loanDate: advanceTable.loanDate,
            repaymentDate: advanceTable.repaymentDate,
            workerId: advanceTable.workerId,
            workerName: workerTable.name,
            createdAt: advanceTable.createdAt,
            updatedAt: advanceTable.updatedAt,
        })
        .from(advanceTable)
        .innerJoin(workerTable, eq(advanceTable.workerId, workerTable.id))
        .where(eq(advanceTable.id, id))
        .limit(1);

    const r = rows[0];
    if (!r) return null;

    return {
        id: r.id,
        amount: r.amount,
        status: r.status,
        loanDate: normalizePgDate(r.loanDate),
        repaymentDate:
            r.repaymentDate == null
                ? null
                : normalizePgDate(r.repaymentDate),
        workerId: r.workerId,
        workerName: r.workerName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
