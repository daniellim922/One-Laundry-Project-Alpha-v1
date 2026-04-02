import type {
    ColumnDef,
    OnChangeFn,
    RowSelectionState,
} from "@tanstack/react-table";
import type * as React from "react";

export interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    /** Name of the URL search param to sync the filter with (e.g. "search"). */
    searchParamKey?: string;
    /** Whether the global search should sync to the URL (defaults to true). */
    syncSearchToUrl?: boolean;
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

