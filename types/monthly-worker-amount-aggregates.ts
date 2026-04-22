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
    totalAmount: number;
};

export type MonthlyWorkerAmountAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: MonthlyWorkerAmountRow[];
};
