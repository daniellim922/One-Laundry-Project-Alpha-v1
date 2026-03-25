"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

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

type Worker = {
    id: string;
    name: string;
    status: string;
    employmentType: string;
    employmentArrangement: string;
};

const sortableHeader =
    (label: string) =>
    ({
        column,
    }: {
        column: {
            toggleSorting: (asc: boolean) => void;
            getIsSorted: () => false | "asc" | "desc";
        };
    }) => (
        <Button
            type="button"
            variant="ghost"
            className="px-0 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {label}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    );

export function PayrollForm({ workers }: { workers: Worker[] }) {
    const router = useRouter();
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const columns: ColumnDef<Worker>[] = React.useMemo(
        () => [
            {
                id: "select",
                enableSorting: false,
                enableColumnFilter: false,
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
                header: sortableHeader("Worker"),
            },
            {
                accessorKey: "employmentArrangement",
                header: sortableHeader("Arrangement"),
                cell: ({ row }) => {
                    const arrangement = row.original.employmentArrangement;
                    const isForeign =
                        arrangement.toLowerCase() === "foreign worker";
                    return (
                        <span
                            className={
                                isForeign
                                    ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                                    : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
                            }>
                            {arrangement}
                        </span>
                    );
                },
            },
            {
                accessorKey: "employmentType",
                header: sortableHeader("Type"),
                cell: ({ row }) => {
                    const type = row.original.employmentType;
                    const isFullTime = type.toLowerCase() === "full time";
                    return (
                        <span
                            className={
                                isFullTime
                                    ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
                                    : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200"
                            }>
                            {type}
                        </span>
                    );
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                enableSorting: false,
                enableColumnFilter: false,
                cell: ({ row }) => {
                    const status = row.original.status;
                    const isActive = status.toLowerCase() === "active";
                    return (
                        <span
                            className={
                                isActive
                                    ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800"
                                    : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800"
                            }
                        >
                            {status}
                        </span>
                    );
                },
            },
        ],
        [],
    );

    const table = useReactTable({
        data: workers,
        columns,
        state: {
            rowSelection,
            columnFilters,
            sorting,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row.id,
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
        router.push("/dashboard/payroll/all");
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
                                    <TableRow>
                                        {table
                                            .getHeaderGroups()
                                            .at(-1)
                                            ?.headers.map((header) => (
                                                <TableHead
                                                    key={`${header.id}-filter`}
                                                    className="px-2 py-1">
                                                    {header.column.getCanFilter() ? (
                                                        <Input
                                                            placeholder="Filter..."
                                                            value={
                                                                (header.column.getFilterValue() as string) ??
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                header.column.setFilterValue(
                                                                    e.target.value || undefined,
                                                                )
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    ) : null}
                                                </TableHead>
                                            ))}
                                    </TableRow>
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
