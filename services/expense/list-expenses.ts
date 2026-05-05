import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { expensesTable } from "@/db/tables/expensesTable";
import type { ExpenseStatus } from "@/types/status";

export type ExpenseListRow = {
    id: string;
    categoryName: string;
    subcategoryName: string;
    supplierName: string;
    description: string | null;
    invoiceNumber: string | null;
    supplierGstRegNumber: string | null;
    subtotalCents: number;
    gstCents: number;
    grandTotalCents: number;
    invoiceDate: string;
    submissionDate: string;
    status: ExpenseStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type ExpenseListFilters = {
    categoryName?: string;
    subcategoryName?: string;
    status?: ExpenseStatus;
};

export async function listExpensesWithCategories(
    filters: ExpenseListFilters = {},
): Promise<ExpenseListRow[]> {
    const conditions = [];
    if (filters.categoryName?.trim()) {
        conditions.push(
            eq(expensesTable.categoryName, filters.categoryName.trim()),
        );
    }
    if (filters.subcategoryName?.trim()) {
        conditions.push(
            eq(expensesTable.subcategoryName, filters.subcategoryName.trim()),
        );
    }
    if (filters.status) {
        conditions.push(eq(expensesTable.status, filters.status));
    }

    const whereClause =
        conditions.length === 0
            ? undefined
            : conditions.length === 1
              ? conditions[0]
              : and(...conditions);

    const rows = await db
        .select({
            id: expensesTable.id,
            categoryName: expensesTable.categoryName,
            subcategoryName: expensesTable.subcategoryName,
            supplierName: expensesTable.supplierName,
            description: expensesTable.description,
            invoiceNumber: expensesTable.invoiceNumber,
            supplierGstRegNumber: expensesTable.supplierGstRegNumber,
            subtotalCents: expensesTable.subtotalCents,
            gstCents: expensesTable.gstCents,
            grandTotalCents: expensesTable.grandTotalCents,
            invoiceDate: expensesTable.invoiceDate,
            submissionDate: expensesTable.submissionDate,
            status: expensesTable.status,
            createdAt: expensesTable.createdAt,
            updatedAt: expensesTable.updatedAt,
        })
        .from(expensesTable)
        .where(whereClause)
        .orderBy(
            desc(expensesTable.submissionDate),
            asc(expensesTable.supplierName),
        );

    return rows.map((r) => ({
        ...r,
        invoiceDate:
            typeof r.invoiceDate === "string"
                ? r.invoiceDate
                : String(r.invoiceDate),
        submissionDate:
            typeof r.submissionDate === "string"
                ? r.submissionDate
                : String(r.submissionDate),
    }));
}

export async function getExpenseDetailById(
    id: string,
): Promise<ExpenseListRow | null> {
    const [row] = await db
        .select({
            id: expensesTable.id,
            categoryName: expensesTable.categoryName,
            subcategoryName: expensesTable.subcategoryName,
            supplierName: expensesTable.supplierName,
            description: expensesTable.description,
            invoiceNumber: expensesTable.invoiceNumber,
            supplierGstRegNumber: expensesTable.supplierGstRegNumber,
            subtotalCents: expensesTable.subtotalCents,
            gstCents: expensesTable.gstCents,
            grandTotalCents: expensesTable.grandTotalCents,
            invoiceDate: expensesTable.invoiceDate,
            submissionDate: expensesTable.submissionDate,
            status: expensesTable.status,
            createdAt: expensesTable.createdAt,
            updatedAt: expensesTable.updatedAt,
        })
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .limit(1);

    if (!row) return null;

    return {
        ...row,
        invoiceDate:
            typeof row.invoiceDate === "string"
                ? row.invoiceDate
                : String(row.invoiceDate),
        submissionDate:
            typeof row.submissionDate === "string"
                ? row.submissionDate
                : String(row.submissionDate),
    };
}
