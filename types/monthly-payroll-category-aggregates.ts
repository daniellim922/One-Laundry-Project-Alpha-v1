/** Normalized worker names for the “named pair” subtotal bucket (case-insensitive in SQL). */
export const DASHBOARD_PAYROLL_NAMED_WORKER_NAMES_NORMALIZED = [
    "alvis ong thai ying",
    "ong chong wee",
] as const;

export const PAYROLL_CHART_CATEGORY_KEYS = [
    "ptForeignSubtotal",
    "ftForeignSubtotal",
    "namedWorkersSubtotal",
    "ftLocalCpf",
] as const;

export type PayrollChartCategoryKey = (typeof PAYROLL_CHART_CATEGORY_KEYS)[number];

/** One row per calendar month with Settled payroll aggregates for the dashboard chart. */
export type MonthlyPayrollCategoryMonthRow = {
    year: number;
    month: number;
    ptForeignSubtotal: number;
    ftForeignSubtotal: number;
    namedWorkersSubtotal: number;
    ftLocalCpf: number;
};

export type MonthlyPayrollCategoryAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: MonthlyPayrollCategoryMonthRow[];
};
