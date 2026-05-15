import * as XLSX from "@e965/xlsx";

import type { ExpenseListRow } from "@/services/expense/list-expenses";

/** User-facing column order for the all-expenses Excel export. */
export const EXPENSE_EXPORT_HEADERS = [
    "Expense ID",
    "Supplier",
    "Category",
    "Subcategory",
    "Description",
    "Invoice Number",
    "Supplier GST Registration Number",
    "Subtotal",
    "GST",
    "Grand Total",
    "Invoice Date",
    "Submission Date",
    "Status",
    "Created At",
    "Updated At",
] as const;

function centsToSgdDecimal(cents: number): number {
    return cents / 100;
}

function rowToExportRecord(
    row: ExpenseListRow,
): Record<(typeof EXPENSE_EXPORT_HEADERS)[number], string | number> {
    return {
        "Expense ID": row.id,
        Supplier: row.supplierName,
        Category: row.categoryName,
        Subcategory: row.subcategoryName,
        Description: row.description ?? "",
        "Invoice Number": row.invoiceNumber ?? "",
        "Supplier GST Registration Number": row.supplierGstRegNumber ?? "",
        Subtotal: centsToSgdDecimal(row.subtotalCents),
        GST: centsToSgdDecimal(row.gstCents),
        "Grand Total": centsToSgdDecimal(row.grandTotalCents),
        "Invoice Date": row.invoiceDate,
        "Submission Date": row.submissionDate,
        Status: row.status,
        "Created At": row.createdAt.toISOString(),
        "Updated At": row.updatedAt.toISOString(),
    };
}

export function buildExpensesExportXlsxBuffer(rows: ExpenseListRow[]): Buffer {
    const records = rows.map(rowToExportRecord);
    const sheet =
        records.length === 0
            ? XLSX.utils.json_to_sheet([], {
                  header: [...EXPENSE_EXPORT_HEADERS],
              })
            : XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Expenses");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
