import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
} from "@/types/status";

export type TimesheetMonthlyHoursAggregateRow = {
    workerId: string;
    workerName: string;
    employmentType: WorkerEmploymentType;
    employmentArrangement: WorkerEmploymentArrangement;
    year: number;
    month: number;
    totalHours: number;
};

export type TimesheetMonthlyHoursAggregatesPayload = {
    defaultYear: number;
    yearOptions: number[];
    rows: TimesheetMonthlyHoursAggregateRow[];
};
