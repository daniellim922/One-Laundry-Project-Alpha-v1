"use client";

import * as React from "react";
import Link from "next/link";
import type { RowSelectionState } from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import type { ExpenseListRow } from "@/services/expense/list-expenses";

import { selectableExpenseColumns } from "../selectable-expense-columns";

function filenameFromContentDisposition(header: string | null): string | null {
    if (!header) return null;
    const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(
        header,
    );
    const raw = m?.[1] ?? m?.[2] ?? m?.[3];
    if (!raw) return null;
    try {
        return decodeURIComponent(raw.trim());
    } catch {
        return raw.trim();
    }
}

export function ExpensesAllTable({ expenses }: { expenses: ExpenseListRow[] }) {
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
        {},
    );
    const [exporting, setExporting] = React.useState(false);

    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k],
    ).length;

    async function handleExportSelected() {
        const selectedIds = Object.keys(rowSelection).filter(
            (k) => rowSelection[k],
        );
        if (selectedIds.length === 0) return;

        setExporting(true);
        try {
            const res = await fetch("/api/expenses/export", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (!res.ok) return;

            const blob = await res.blob();
            const fallbackName = "expenses-export-selected.xlsx";
            const name =
                filenameFromContentDisposition(
                    res.headers.get("Content-Disposition"),
                ) ?? fallbackName;

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }

    return (
        <DataTable
            columns={selectableExpenseColumns}
            data={expenses}
            searchParamKey="search"
            enableRowSelection
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            getRowId={(row) => row.id}
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={selectedCount === 0 || exporting}
                        onClick={() => void handleExportSelected()}>
                        <Download className="mr-2 h-4 w-4" />
                        {exporting
                            ? "Exporting…"
                            : `Export selected (${selectedCount})`}
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard/expenses/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add expense
                        </Link>
                    </Button>
                </div>
            }
        />
    );
}
