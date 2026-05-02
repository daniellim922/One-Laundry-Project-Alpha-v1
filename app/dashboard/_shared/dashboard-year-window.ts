import { sql, type Column } from "drizzle-orm";

/** Last five calendar years ending at `now`, used by dashboard aggregate queries. */
export function dashboardYearWindow(now = new Date()) {
    const maxYear = now.getFullYear();
    const minYear = maxYear - 4;
    const yearOptions = Array.from({ length: 5 }, (_, i) => maxYear - i);
    return { maxYear, minYear, yearOptions };
}

export function yearMonthSqlFromColumn(column: Column) {
    const yearExpr = sql<number>`extract(year from ${column})::int`;
    const monthExpr = sql<number>`extract(month from ${column})::int`;
    return { yearExpr, monthExpr };
}
