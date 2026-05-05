export type MonthlySupplierAmountRow = {
    supplierName: string;
    categoryName: string;
    subcategoryName: string;
    year: number;
    month: number;
    /** Sum of `grand_total_cents` converted to dollars. */
    grandTotalAmount: number;
    /** Sum of `subtotal_cents` converted to dollars. */
    subTotalAmount: number;
};

export type MonthlySupplierAmountAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: MonthlySupplierAmountRow[];
};
