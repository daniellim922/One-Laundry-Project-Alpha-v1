"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
  /** Key in the data used for simple text filtering (e.g. "name") */
  searchKey?: keyof TData & string;
  /** Name of the URL search param to sync the filter with (e.g. "search"). */
  searchParamKey?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchParamKey,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const initialFilter = React.useMemo(() => {
    if (!searchParamKey) return "";
    return searchParams.get(searchParamKey) ?? "";
  }, [searchParams, searchParamKey]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState(initialFilter);

  React.useEffect(() => {
    if (!searchParamKey) return;
    const currentValue = searchParams.get(searchParamKey) ?? "";
    setGlobalFilter((prev) => (prev === currentValue ? prev : currentValue));
  }, [searchParamKey, searchParams]);

  const updateUrlFilter = React.useCallback(
    (value: string) => {
      if (!searchParamKey) return;
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(searchParamKey, value);
      } else {
        params.delete(searchParamKey);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParamKey, searchParams],
  );

  const handleFilterChange = (value: string) => {
    setGlobalFilter(value);
    updateUrlFilter(value);
  };

  const table = useReactTable({
    data,
    columns,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: handleFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const search = String(filterValue).toLowerCase();
      const values = Object.values(row.original ?? {});

      return values.some((value) => {
        if (value == null) return false;

        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return String(value).toLowerCase().includes(search);
        }

        if (value instanceof Date) {
          return value.toISOString().toLowerCase().includes(search);
        }

        return false;
      });
    },
  });

  return (
    <div className="space-y-4">
      {searchKey ? (
        <div className="flex items-center justify-between gap-2">
          <Input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(event) => handleFilterChange(event.target.value)}
            className="max-w-xs"
          />
        </div>
      ) : null}

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
                          header.column.columnDef.header,
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
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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

