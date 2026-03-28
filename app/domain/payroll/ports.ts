import type { employmentTable } from "@/db/tables/payroll/employmentTable";
import type { payrollTable } from "@/db/tables/payroll/payrollTable";
import type { payrollVoucherTable } from "@/db/tables/payroll/payrollVoucherTable";
import type { timesheetTable } from "@/db/tables/payroll/timesheetTable";

export type EmploymentRow = typeof employmentTable.$inferSelect;
export type PayrollRow = typeof payrollTable.$inferSelect;
export type VoucherRestDayRow = Pick<
    typeof payrollVoucherTable.$inferSelect,
    "restDays" | "publicHolidays"
>;
export type WorkerTimesheetRow = Pick<typeof timesheetTable.$inferSelect, "hours">;

export type AdvanceLoan = {
    amount: number;
    status: "loan" | "paid";
};

export interface PayrollSyncRepository {
    getDraftPayrollsForWorker(workerId: string): Promise<PayrollRow[]>;
    getEmploymentForWorker(workerId: string): Promise<EmploymentRow | null>;
    getTimesheetHoursForPeriod(args: {
        workerId: string;
        periodStart: string;
        periodEnd: string;
    }): Promise<WorkerTimesheetRow[]>;
    getVoucherRestDays(voucherId: string): Promise<VoucherRestDayRow | null>;
    getLoanAdvancesForPeriod(args: {
        workerId: string;
        periodStart: string;
        periodEnd: string;
    }): Promise<AdvanceLoan[]>;
    updateVoucher(input: {
        voucherId: string;
        employment: EmploymentRow;
        totalHoursWorked: number;
        hoursNotMet: number | null;
        hoursNotMetDeduction: number;
        overtimeHours: number;
        overtimePay: number;
        restDayPay: number;
        publicHolidayPay: number;
        advanceTotal: number;
        totalPay: number;
        netPay: number;
    }): Promise<void>;
}
