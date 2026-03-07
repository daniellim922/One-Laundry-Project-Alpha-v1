"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { createPayrolls } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

type Worker = { id: string; name: string };

export function PayrollForm({ workers }: { workers: Worker[] }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
    const [globalFilter, setGlobalFilter] = React.useState("");

    const columns: ColumnDef<Worker>[] = React.useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllRowsSelected()
                                ? true
                                : table.getIsSomeRowsSelected()
                                  ? "indeterminate"
                                  : false
                        }
                        onCheckedChange={(checked) =>
                            table.toggleAllRowsSelected(!!checked)
                        }
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(checked) =>
                            row.toggleSelected(!!checked)
                        }
                        aria-label={`Select ${row.original.name}`}
                    />
                ),
            },
            {
                accessorKey: "name",
                header: "Worker",
            },
        ],
        [],
    );

    const table = useReactTable({
        data: workers,
        columns,
        state: {
            rowSelection,
            globalFilter,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowId: (row) => row.id,
        globalFilterFn: (row, _columnId, filterValue) => {
            if (!filterValue) return true;
            const search = String(filterValue).toLowerCase();
            return row.original.name.toLowerCase().includes(search);
        },
    });

    const selectedCount = table.getSelectedRowModel().rows.length;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setPending(true);
        const form = e.currentTarget;
        const periodStart = (form.elements.namedItem("periodStart") as HTMLInputElement)?.value;
        const periodEnd = (form.elements.namedItem("periodEnd") as HTMLInputElement)?.value;
        const payrollDate = (form.elements.namedItem("payrollDate") as HTMLInputElement)?.value;

        const selectedRows = table.getSelectedRowModel().rows;
        const workerIds = selectedRows.map((row) => row.original.id);

        const formData = new FormData();
        formData.set("periodStart", periodStart);
        formData.set("periodEnd", periodEnd);
        formData.set("payrollDate", payrollDate);
        workerIds.forEach((id) => formData.append("workerId", id));

        const result = await createPayrolls(formData);
        setPending(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/dashboard/payroll");
        router.refresh();
    }

    const today = new Date().toISOString().slice(0, 10);

    return (
        <Card className="mx-auto max-w-2xl">
            <CardHeader>
                <CardTitle>New payroll</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Select workers and pay period. Hours and pay are computed from timesheet entries.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="periodStart">Period start</Label>
                            <Input
                                id="periodStart"
                                name="periodStart"
                                type="date"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="periodEnd">Period end</Label>
                            <Input
                                id="periodEnd"
                                name="periodEnd"
                                type="date"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payrollDate">Payroll date</Label>
                        <Input
                            id="payrollDate"
                            name="payrollDate"
                            type="date"
                            defaultValue={today}
                            suppressHydrationWarning
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label>Workers</Label>
                            <Input
                                placeholder="Search workers..."
                                value={globalFilter ?? ""}
                                onChange={(e) =>
                                    setGlobalFilter(e.target.value)
                                }
                                className="max-w-xs"
                            />
                        </div>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                              header.column
                                                                  .columnDef
                                                                  .header,
                                                              header.getContext(),
                                                          )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={
                                                    row.getIsSelected()
                                                        ? "selected"
                                                        : undefined
                                                }
                                            >
                                                {row
                                                    .getVisibleCells()
                                                    .map((cell) => (
                                                        <TableCell
                                                            key={cell.id}
                                                        >
                                                            {flexRender(
                                                                cell.column
                                                                    .columnDef
                                                                    .cell,
                                                                cell.getContext(),
                                                            )}
                                                        </TableCell>
                                                    ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                No workers found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {selectedCount > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {selectedCount} worker
                                {selectedCount !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={pending || selectedCount === 0}
                        >
                            {pending ? "Generating..." : "Generate"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
