"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import {
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { expenseStatusBadgeTone } from "@/types/badge-tones";
import type { ExpenseListRow } from "@/services/expense/list-expenses";
import {
    createActionsColumn,
    createBadgeCell,
    createSortableHeader,
    RowActionsMenu,
} from "@/components/data-table/column-builders";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";

import { ExpenseMarkPaidMenuItem } from "./expense-mark-paid-menu-item";

function formatSgdCents(cents: number) {
    return `$${(cents / 100).toLocaleString("en-SG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export const columns: ColumnDef<ExpenseListRow>[] = [
    {
        accessorKey: "supplierName",
        header: createSortableHeader("Supplier"),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "categoryName",
        header: createSortableHeader("Category"),
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
                <span>{row.original.categoryName}</span>
                <Badge variant="outline" className="w-fit text-xs font-normal">
                    {row.original.subcategoryName}
                </Badge>
            </div>
        ),
        meta: { globalSearch: true },
    },
    {
        accessorKey: "subtotalCents",
        header: createSortableHeader("Subtotal"),
        cell: ({ row }) => formatSgdCents(row.original.subtotalCents),
    },
    {
        accessorKey: "gstCents",
        header: createSortableHeader("GST 9%"),
        cell: ({ row }) => formatSgdCents(row.original.gstCents),
    },
    {
        accessorKey: "grandTotalCents",
        header: createSortableHeader("Grand total"),
        cell: ({ row }) => formatSgdCents(row.original.grandTotalCents),
    },
    {
        accessorKey: "invoiceDate",
        header: createSortableHeader("Invoice date"),
        cell: ({ row }) =>
            formatEnGbDmyNumericFromCalendar(row.original.invoiceDate),
    },
    {
        accessorKey: "status",
        header: createSortableHeader("Status"),
        meta: { globalSearch: true },
        cell: createBadgeCell<ExpenseListRow>({
            value: (r) => r.status,
            variant: "outline",
            toneClassNameFor: (r) => expenseStatusBadgeTone[r.status],
        }),
    },
    createActionsColumn<ExpenseListRow>({
        cell: (expenseRow) => {
            const isPaid = expenseRow.status === "Expense Paid";
            return (
                <RowActionsMenu>
                    <DropdownMenuItem asChild>
                        <Link
                            href={`/dashboard/expenses/${expenseRow.id}/view`}
                            className="flex w-full items-center gap-2">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </Link>
                    </DropdownMenuItem>
                    {isPaid ? (
                        <DropdownMenuItem
                            disabled
                            className="flex w-full items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem asChild>
                            <Link
                                href={`/dashboard/expenses/${expenseRow.id}/edit`}
                                className="flex w-full items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <ExpenseMarkPaidMenuItem
                        expenseId={expenseRow.id}
                        disabled={isPaid}
                    />
                </RowActionsMenu>
            );
        },
    }),
];
