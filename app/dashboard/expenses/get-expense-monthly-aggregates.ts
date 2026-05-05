import { and, gte, lte, sql } from "drizzle-orm";

import {
    dashboardYearWindow,
    yearMonthSqlFromColumn,
} from "@/app/dashboard/_shared/dashboard-year-window";
import { expensesTable } from "@/db/tables/expensesTable";
import { db } from "@/lib/db";
import type { MonthlySupplierAmountAggregatesPayload } from "@/types/monthly-supplier-amount-aggregates";

export async function getExpenseMonthlyAggregates(): Promise<MonthlySupplierAmountAggregatesPayload> {
    const { maxYear, minYear, yearOptions } = dashboardYearWindow();
    const { yearExpr, monthExpr } = yearMonthSqlFromColumn(
        expensesTable.invoiceDate,
    );

    const raw = (await db
        .select({
            supplierName: expensesTable.supplierName,
            categoryName: expensesTable.categoryName,
            subcategoryName: expensesTable.subcategoryName,
            year: yearExpr,
            month: monthExpr,
            grandTotalAmount:
                sql<number>`coalesce(sum(${expensesTable.grandTotalCents}), 0)::double precision / 100.0`,
            subTotalAmount:
                sql<number>`coalesce(sum(${expensesTable.subtotalCents}), 0)::double precision / 100.0`,
        })
        .from(expensesTable)
        .where(
            and(
                gte(expensesTable.invoiceDate, `${minYear}-01-01`),
                lte(expensesTable.invoiceDate, `${maxYear}-12-31`),
            ),
        )
        .groupBy(
            expensesTable.supplierName,
            expensesTable.categoryName,
            expensesTable.subcategoryName,
            yearExpr,
            monthExpr,
        )) as {
        supplierName: string;
        categoryName: string;
        subcategoryName: string;
        year: number;
        month: number;
        grandTotalAmount: number;
        subTotalAmount: number;
    }[];

    return {
        defaultYear: maxYear,
        yearOptions,
        rows: raw.map((r) => ({
            supplierName: r.supplierName,
            categoryName: r.categoryName,
            subcategoryName: r.subcategoryName,
            year: Number(r.year),
            month: Number(r.month),
            grandTotalAmount: Number(r.grandTotalAmount),
            subTotalAmount: Number(r.subTotalAmount),
        })),
    };
}
