"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { createRowSelectionColumn } from "@/components/data-table/column-builders";
import type { ExpenseListRow } from "@/services/expense/list-expenses";

import { columns as baseColumns } from "./columns";

export const selectableExpenseColumns: ColumnDef<ExpenseListRow>[] = [
    createRowSelectionColumn<ExpenseListRow>({
        ariaLabelForRow: (r) => `Select expense ${r.supplierName}`,
    }),
    ...baseColumns,
];
