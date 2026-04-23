"use client";

import {
    formatStackedChartCurrency,
    getStackedRowGrandTotalAmount,
    MonthlyWorkerStackedAmountOverviewCard,
    type MonthlyWorkerStackedAmountCopy,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";

import type { AdvanceMonthlyRepaymentAggregateRow } from "@/types/advance-monthly-repayment-aggregates";

const ADVANCE_MONTHLY_REPAYMENT_COPY = {
    title: "Monthly advance repayments",
    description:
        "Repayment-term installment amounts (advance rows) with repayment in each month, stacked by worker. Not request totals. Employment type and arrangement in the top row bulk select or clear all workers in that group; individual workers can be toggled in the list. Only workers with a repayment in the selected year are listed.",
    emptyListYear: "No advance repayments for this year.",
    emptyListEmployment:
        "No workers match the selected employment filters.",
    emptyListSearch: "No workers match this search.",
    emptyChartYear: "No repayments to chart for this year.",
    emptyChartEmployment: "No repayments to chart — all workers are deselected.",
    emptyChartMonths: "Select at least one month to see the chart.",
    emptyChartSelection:
        "Select workers or adjust search to see the chart.",
    idPrefix: "advance-rp",
    stackId: "repayment",
    formatValue: formatStackedChartCurrency,
} satisfies MonthlyWorkerStackedAmountCopy;

export function AdvanceMonthlyRepaymentOverviewCard({
    rows,
    defaultYear,
    yearOptions,
}: {
    rows: AdvanceMonthlyRepaymentAggregateRow[];
    defaultYear: number;
    yearOptions: number[];
}) {
    return (
        <MonthlyWorkerStackedAmountOverviewCard
            rows={rows}
            getValue={getStackedRowGrandTotalAmount}
            defaultYear={defaultYear}
            yearOptions={yearOptions}
            copy={ADVANCE_MONTHLY_REPAYMENT_COPY}
        />
    );
}
