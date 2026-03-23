import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { advanceRequestTable } from "@/db/tables/payroll/advanceRequestTable";
import { advanceTable } from "@/db/tables/payroll/advanceTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { db } from "@/lib/db";

function normalizePgDate(value: string | Date): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return value;
}

export type AdvanceRequestWithWorker = {
    id: string;
    workerId: string;
    workerName: string;
    amountRequested: number;
    status: "loan" | "paid";
    requestDate: string;
    createdAt: Date;
    updatedAt: Date;
};

function deriveStatusFromAdvances(advances: { status: "loan" | "paid" }[]): "loan" | "paid" {
    if (advances.length === 0) return "loan";
    return advances.every((a) => a.status === "paid") ? "paid" : "loan";
}

export type AdvanceWithRepayment = {
    id: string;
    amount: number;
    status: "loan" | "paid";
    repaymentDate: string | null;
};

export async function listAdvanceRequestsWithWorkers(
    database: typeof db = db,
): Promise<AdvanceRequestWithWorker[]> {
    const rows = await database
        .select({
            id: advanceRequestTable.id,
            workerId: advanceRequestTable.workerId,
            workerName: workerTable.name,
            amountRequested: advanceRequestTable.amountRequested,
            requestDate: advanceRequestTable.requestDate,
            createdAt: advanceRequestTable.createdAt,
            updatedAt: advanceRequestTable.updatedAt,
        })
        .from(advanceRequestTable)
        .innerJoin(workerTable, eq(advanceRequestTable.workerId, workerTable.id))
        .orderBy(desc(advanceRequestTable.requestDate));

    if (rows.length === 0) return [];

    const requestIds = rows.map((r) => r.id);
    const advanceRows = await database
        .select({
            advanceRequestId: advanceTable.advanceRequestId,
            status: advanceTable.status,
        })
        .from(advanceTable)
        .where(inArray(advanceTable.advanceRequestId, requestIds));

    const advancesByRequestId = advanceRows.reduce<
        Record<string, { status: "loan" | "paid" }[]>
    >((acc, a) => {
        const id = a.advanceRequestId;
        if (!acc[id]) acc[id] = [];
        acc[id]!.push({ status: a.status });
        return acc;
    }, {});

    return rows.map((r) => ({
        id: r.id,
        workerId: r.workerId,
        workerName: r.workerName,
        amountRequested: r.amountRequested,
        status: deriveStatusFromAdvances(
            advancesByRequestId[r.id] ?? [],
        ),
        requestDate: normalizePgDate(r.requestDate),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    }));
}

export type AdvanceRequestDetail = {
    request: AdvanceRequestWithWorker;
    advances: AdvanceWithRepayment[];
    purpose: string | null;
    employeeSignature: string | null;
    employeeSignatureDate: string | null;
    managerSignature: string | null;
    managerSignatureDate: string | null;
};

export async function getAdvanceRequestByIdWithWorker(
    id: string,
    database: typeof db = db,
): Promise<AdvanceRequestDetail | null> {
    const requestRows = await database
        .select({
            id: advanceRequestTable.id,
            workerId: advanceRequestTable.workerId,
            workerName: workerTable.name,
            amountRequested: advanceRequestTable.amountRequested,
            requestDate: advanceRequestTable.requestDate,
            purpose: advanceRequestTable.purpose,
            employeeSignature: advanceRequestTable.employeeSignature,
            employeeSignatureDate: advanceRequestTable.employeeSignatureDate,
            managerSignature: advanceRequestTable.managerSignature,
            managerSignatureDate: advanceRequestTable.managerSignatureDate,
            createdAt: advanceRequestTable.createdAt,
            updatedAt: advanceRequestTable.updatedAt,
        })
        .from(advanceRequestTable)
        .innerJoin(workerTable, eq(advanceRequestTable.workerId, workerTable.id))
        .where(eq(advanceRequestTable.id, id))
        .limit(1);

    const req = requestRows[0];
    if (!req) return null;

    const advanceRows = await database
        .select({
            id: advanceTable.id,
            amount: advanceTable.amount,
            status: advanceTable.status,
            repaymentDate: advanceTable.repaymentDate,
        })
        .from(advanceTable)
        .where(eq(advanceTable.advanceRequestId, id))
        .orderBy(advanceTable.repaymentDate);

    const advances: AdvanceWithRepayment[] = advanceRows.map((a) => ({
        id: a.id,
        amount: a.amount,
        status: a.status,
        repaymentDate:
            a.repaymentDate == null
                ? null
                : normalizePgDate(a.repaymentDate),
    }));

    const request: AdvanceRequestWithWorker = {
        id: req.id,
        workerId: req.workerId,
        workerName: req.workerName,
        amountRequested: req.amountRequested,
        status: deriveStatusFromAdvances(advances),
        requestDate: normalizePgDate(req.requestDate),
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
    };

    return {
        request,
        advances,
        purpose: req.purpose,
        employeeSignature: req.employeeSignature,
        employeeSignatureDate:
            req.employeeSignatureDate == null
                ? null
                : normalizePgDate(req.employeeSignatureDate),
        managerSignature: req.managerSignature,
        managerSignatureDate:
            req.managerSignatureDate == null
                ? null
                : normalizePgDate(req.managerSignatureDate),
    };
}

export type AdvanceForPayrollPeriod = {
    id: string;
    amount: number;
    status: "loan" | "paid";
    repaymentDate: string | null;
    advanceRequestId: string;
};

export async function getAdvancesForPayrollPeriod(
    workerId: string,
    periodStart: string,
    periodEnd: string,
    database: typeof db = db,
): Promise<AdvanceForPayrollPeriod[]> {
    const rows = await database
        .select({
            id: advanceTable.id,
            amount: advanceTable.amount,
            status: advanceTable.status,
            repaymentDate: advanceTable.repaymentDate,
            advanceRequestId: advanceTable.advanceRequestId,
        })
        .from(advanceTable)
        .innerJoin(
            advanceRequestTable,
            eq(advanceTable.advanceRequestId, advanceRequestTable.id),
        )
        .where(
            and(
                eq(advanceRequestTable.workerId, workerId),
                gte(advanceTable.repaymentDate, periodStart),
                lte(advanceTable.repaymentDate, periodEnd),
            ),
        )
        .orderBy(advanceTable.repaymentDate);

    return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        status: r.status,
        repaymentDate:
            r.repaymentDate == null
                ? null
                : normalizePgDate(r.repaymentDate),
        advanceRequestId: r.advanceRequestId,
    }));
}
