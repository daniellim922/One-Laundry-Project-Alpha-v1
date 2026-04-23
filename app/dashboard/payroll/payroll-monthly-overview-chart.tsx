"use client";

import * as React from "react";

import {
    getStackedRowSubTotalAmount,
    getStackedRowTotalAmount,
    MonthlyWorkerStackedAmountOverviewCard,
    type MonthlyWorkerStackedAmountCopy,
    type StackedAmountMetric,
} from "@/components/dashboard/monthly-worker-stacked-amount-overview-card";
import type { MonthlyWorkerAmountRow } from "@/types/monthly-worker-amount-aggregates";

export function PayrollMonthlyOverviewChart({
    rows,
    defaultYear,
    yearOptions,
    copy,
}: {
    rows: MonthlyWorkerAmountRow[];
    defaultYear: number;
    yearOptions: number[];
    copy: MonthlyWorkerStackedAmountCopy;
}) {
    const [amountMetric, setAmountMetric] =
        React.useState<StackedAmountMetric>("grandTotal");

    const getValue = React.useCallback(
        (r: MonthlyWorkerAmountRow) =>
            amountMetric === "grandTotal"
                ? getStackedRowTotalAmount(r)
                : getStackedRowSubTotalAmount(r),
        [amountMetric],
    );

    const chartStackId =
        amountMetric === "grandTotal" ? "grandTotal" : "subTotal";

    return (
        <MonthlyWorkerStackedAmountOverviewCard
            rows={rows}
            getValue={getValue}
            defaultYear={defaultYear}
            yearOptions={yearOptions}
            copy={copy}
            amountMetricControl={{
                value: amountMetric,
                onChange: setAmountMetric,
            }}
            chartStackId={chartStackId}
        />
    );
}
