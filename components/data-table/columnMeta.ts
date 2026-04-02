import type { Cell, Column } from "@tanstack/react-table";

export type ColumnMeta = { globalSearch?: boolean };

export function isGloballySearchableColumn<TData>(
    column: Column<TData, unknown>,
): boolean {
    const meta = (column.columnDef as { meta?: ColumnMeta }).meta;
    return (meta?.globalSearch ?? true) !== false;
}

export function isGloballySearchableCell<TData>(
    cell: Cell<TData, unknown>,
): boolean {
    return isGloballySearchableColumn(cell.column);
}

