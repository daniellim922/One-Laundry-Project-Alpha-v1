import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";

export type MonthlyWorkerAmountRow = {
    workerId: string;
    workerName: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    year: number;
    month: number;
    /** Voucher grand total (payroll) or the primary amount (advance). */
    totalAmount: number;
    /**
     * Subtotal for payroll vouchers. Zero when the row is not from payroll
     * (e.g. advance repayments).
     */
    subTotalAmount: number;
};

export type MonthlyWorkerAmountAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: MonthlyWorkerAmountRow[];
};
