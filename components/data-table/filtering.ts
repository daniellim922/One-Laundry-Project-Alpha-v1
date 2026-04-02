import type { FilterFn, Row } from "@tanstack/react-table";

import { isGloballySearchableCell } from "./columnMeta";

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

export function filterHaystacksFromValue(v: unknown): string[] {
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

export const containsCi = <TData>(): FilterFn<TData> =>
    (row, columnId, filterValue) => {
        const search = String(filterValue ?? "").trim().toLowerCase();
        if (!search) return true;
        const v = row.getValue(columnId);
        const haystacks = filterHaystacksFromValue(v);
        if (haystacks.length === 0) return false;
        return haystacks.some((h) => h.includes(search));
    };

export function globalSearchRowPredicate<TData>(
    row: Row<TData>,
    filterValue: unknown,
): boolean {
    if (!filterValue) return true;
    const search = String(filterValue).trim().toLowerCase();
    if (!search) return true;

    return row.getVisibleCells().some((cell) => {
        if (!isGloballySearchableCell(cell)) return false;
        const v = cell.getValue();
        const haystacks = filterHaystacksFromValue(v);
        if (haystacks.length === 0) return false;
        return haystacks.some((h) => h.includes(search));
    });
}

