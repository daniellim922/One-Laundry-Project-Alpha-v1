"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Legacy prop (ignored). Global search is driven by column meta. */
  searchKey?: keyof TData & string;
  /** Name of the URL search param to sync the filter with (e.g. "search"). */
  searchParamKey?: string;
  /** Optional actions to render next to the search input (e.g. "Add" button) */
  actions?: React.ReactNode;
  /** Pagination size (defaults to 20). */
  pageSize?: number;
  /** Enable TanStack row selection. */
  enableRowSelection?: boolean;
  /** Controlled row selection state. */
  rowSelection?: RowSelectionState;
  /** Controlled row selection change handler. */
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Stable row id accessor (required for controlled selection with non-index IDs). */
  getRowId?: (originalRow: TData, index: number) => string;
}

type ColumnMeta = { globalSearch?: boolean };

function formatEnGbDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function looksLikeIsoDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function filterHaystacksFromValue(v: unknown): string[] {
  if (v == null) return [];

  if (v instanceof Date) {
    return [v.toISOString(), formatEnGbDate(v)].map((x) => x.toLowerCase());
  }

  const s = String(v);
  const out = [s.toLowerCase()];

  // Common case in this app: dates stored as ISO calendar strings (YYYY-MM-DD)
  // but displayed as DD/MM/YYYY. Let users filter using the displayed format.
  if (typeof v === "string" && looksLikeIsoDateString(v)) {
    const d = new Date(`${v}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      out.push(formatEnGbDate(d).toLowerCase());
    }
  }

  return out;
}

function collectGlobalSearchColumnIds<TData, TValue>(
  defs: ColumnDef<TData, TValue>[],
  out: string[] = [],
): string[] {
  for (const def of defs) {
    const maybeGroup = def as unknown as { columns?: ColumnDef<TData, TValue>[] };
    if (Array.isArray(maybeGroup.columns)) {
      collectGlobalSearchColumnIds(maybeGroup.columns, out);
      continue;
    }

    const meta = (def as unknown as { meta?: ColumnMeta }).meta;
    if (!meta?.globalSearch) continue;

    const id =
      (def as unknown as { id?: string }).id ??
      ((def as unknown as { accessorKey?: unknown }).accessorKey as string | undefined);
    if (id) out.push(id);
  }
  return out;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchKey,
  searchParamKey,
  actions,
  pageSize = 20,
  enableRowSelection,
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const effectiveSearchParamKey = searchParamKey ?? "search";
  const globalSearchColumnIds = React.useMemo(
    () => collectGlobalSearchColumnIds(columns),
    [columns],
  );

  const initialFilter = React.useMemo(() => {
    return searchParams.get(effectiveSearchParamKey) ?? "";
  }, [effectiveSearchParamKey, searchParams]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState(initialFilter);

  React.useEffect(() => {
    const currentValue = searchParams.get(effectiveSearchParamKey) ?? "";
    setGlobalFilter((prev) => (prev === currentValue ? prev : currentValue));
  }, [effectiveSearchParamKey, searchParams]);

  const updateUrlFilter = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(effectiveSearchParamKey, value);
      } else {
        params.delete(effectiveSearchParamKey);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [effectiveSearchParamKey, pathname, router, searchParams],
  );

  const handleFilterChange = (value: string) => {
    setGlobalFilter(value);
    updateUrlFilter(value);
  };

  const containsCi: FilterFn<TData> = React.useCallback(
    (row, columnId, filterValue) => {
      const search = String(filterValue ?? "").trim().toLowerCase();
      if (!search) return true;
      const v = row.getValue(columnId);
      const haystacks = filterHaystacksFromValue(v);
      if (haystacks.length === 0) return false;
      return haystacks.some((h) => h.includes(search));
    },
    [],
  );

  const table = useReactTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      ...(enableRowSelection
        ? { rowSelection: rowSelection ?? {} }
        : undefined),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: handleFilterChange,
    ...(enableRowSelection
      ? { enableRowSelection: true, onRowSelectionChange, getRowId }
      : undefined),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: {
      filterFn: containsCi,
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      if (globalSearchColumnIds.length === 0) return true;

      const search = String(filterValue).trim().toLowerCase();
      if (!search) return true;

      return globalSearchColumnIds.some((columnId) => {
        const v = row.getValue(columnId);
        const haystacks = filterHaystacksFromValue(v);
        if (haystacks.length === 0) return false;
        return haystacks.some((h) => h.includes(search));
      });
    },
  });

  const showSearch = globalSearchColumnIds.length > 0;

  return (
    <div className="space-y-4">
      {showSearch || actions ? (
        <div className="flex items-center justify-between gap-2">
          {showSearch ? (
            <Input
              placeholder="Search..."
              value={globalFilter ?? ""}
              onChange={(event) => handleFilterChange(event.target.value)}
              className="max-w-xs"
            />
          ) : (
            <div />
          )}
          {actions}
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="align-middle">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            <TableRow>
              {table.getHeaderGroups().at(-1)?.headers.map((header) => (
                <TableHead key={`${header.id}-filter`} className="px-2 py-1">
                  {header.column.getCanFilter() ? (
                    <Input
                      placeholder="Filter..."
                      value={(header.column.getFilterValue() as string) ?? ""}
                      onChange={(e) =>
                        header.column.setFilterValue(e.target.value || undefined)
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
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

