"use client";

import {
    MonthlyWorkerStackedAmountOverviewCard,
    type MonthlyWorkerStackedAmountCopy,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";

import type { TimesheetMonthlyHoursAggregateRow } from "@/types/timesheet-monthly-hours-aggregates";

function formatStackedChartHours(n: number): string {
    return `${n.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    })} h`;
}

function getStackedRowTotalHours(r: TimesheetMonthlyHoursAggregateRow): number {
    return r.totalHours;
}

const TIMESHEET_MONTHLY_HOURS_COPY = {
    title: "Monthly working hours",
    description:
        "Total hours per month from timesheet entries (clock-in date), stacked by worker. Employment type and arrangement in the top row bulk select or clear all workers in that group; individual workers can be toggled in the list. Only workers with timesheet rows in the selected year are listed.",
    emptyListYear: "No timesheet data for this year.",
    emptyListEmployment:
        "No workers match the selected employment filters.",
    emptyListSearch: "No workers match this search.",
    emptyChartYear: "No hours to chart for this year.",
    emptyChartEmployment: "No hours to chart — all workers are deselected.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select workers or adjust search to see the chart.",
    idPrefix: "timesheet-hrs",
    stackId: "hours",
    formatValue: formatStackedChartHours,
    yAxisWidth: 44,
} satisfies MonthlyWorkerStackedAmountCopy;

/** Same as `TimesheetMonthlyHoursAggregateRow` (kept for existing imports). */
export type TimesheetMonthlyHoursOverviewRow = TimesheetMonthlyHoursAggregateRow;

export function TimesheetMonthlyHoursOverviewCard({
    rows,
    defaultYear,
    yearOptions,
}: {
    rows: TimesheetMonthlyHoursAggregateRow[];
    defaultYear: number;
    yearOptions: number[];
}) {
    return (
        <MonthlyWorkerStackedAmountOverviewCard
            rows={rows}
            getValue={getStackedRowTotalHours}
            defaultYear={defaultYear}
            yearOptions={yearOptions}
            copy={TIMESHEET_MONTHLY_HOURS_COPY}
        />
    );
}
