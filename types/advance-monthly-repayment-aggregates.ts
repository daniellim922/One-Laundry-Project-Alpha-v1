export type AdvanceMonthlyRepaymentAggregateRow = {
    workerId: string;
    workerName: string;
    year: number;
    month: number;
    totalAmount: number;
};

export type AdvanceMonthlyRepaymentAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: AdvanceMonthlyRepaymentAggregateRow[];
};
