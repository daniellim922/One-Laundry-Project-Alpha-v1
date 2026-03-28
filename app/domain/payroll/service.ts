import { calculatePay } from "@/lib/payroll-utils";
import type { PayrollSyncRepository } from "./ports";

function roundHours(n: number): number {
    return Math.round(n * 100) / 100;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

function clampHoursNotMet(hoursNotMet: number): number {
    return hoursNotMet > 0 ? 0 : hoursNotMet;
}

function calcHoursNotMetDeduction(args: {
    hoursNotMet: number | null;
    hourlyRate: number | null;
}): number {
    const { hoursNotMet, hourlyRate } = args;
    if (hoursNotMet == null || hoursNotMet === 0) return 0;
    return -roundMoney(Math.max(0, -hoursNotMet) * (hourlyRate ?? 0));
}

function calcNetPay(args: {
    totalPay: number;
    cpf: number | null;
    advance?: number | null;
}): number {
    return roundMoney(args.totalPay - (args.cpf ?? 0) - (args.advance ?? 0));
}

export interface PayrollDomainService {
    synchronizeWorkerDrafts(input: { workerId: string }): Promise<void>;
}

class PayrollDomainServiceImpl implements PayrollDomainService {
    constructor(private readonly repo: PayrollSyncRepository) {}

    async synchronizeWorkerDrafts(input: { workerId: string }): Promise<void> {
        const drafts = await this.repo.getDraftPayrollsForWorker(input.workerId);
        if (drafts.length === 0) return;

        const employment = await this.repo.getEmploymentForWorker(input.workerId);
        if (!employment) return;

        for (const payroll of drafts) {
            const entries = await this.repo.getTimesheetHoursForPeriod({
                workerId: input.workerId,
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
            });
            const totalHoursWorked = entries.reduce(
                (sum, entry) => sum + Number(entry.hours),
                0,
            );

            const currentVoucher = await this.repo.getVoucherRestDays(payroll.payrollVoucherId);
            const payCalc = calculatePay({
                employmentType: employment.employmentType,
                totalHoursWorked,
                minimumWorkingHours: employment.minimumWorkingHours,
                monthlyPay: employment.monthlyPay,
                hourlyRate: employment.hourlyRate,
                restDayRate: employment.restDayRate,
                restDays: currentVoucher?.restDays ?? 0,
                publicHolidays: currentVoucher?.publicHolidays ?? 0,
            });

            const hoursNotMet =
                employment.minimumWorkingHours != null
                    ? clampHoursNotMet(
                          roundHours(totalHoursWorked - employment.minimumWorkingHours),
                      )
                    : null;
            const hoursNotMetDeduction = calcHoursNotMetDeduction({
                hoursNotMet,
                hourlyRate: employment.hourlyRate,
            });
            const totalPay = roundMoney(payCalc.totalPay + hoursNotMetDeduction);

            const advances = await this.repo.getLoanAdvancesForPeriod({
                workerId: input.workerId,
                periodStart: payroll.periodStart,
                periodEnd: payroll.periodEnd,
            });
            const advanceTotal = advances
                .filter((advance) => advance.status === "loan")
                .reduce((sum, advance) => sum + advance.amount, 0);
            const netPay = calcNetPay({
                totalPay,
                cpf: employment.cpf,
                advance: advanceTotal,
            });

            await this.repo.updateVoucher({
                voucherId: payroll.payrollVoucherId,
                employment,
                totalHoursWorked,
                hoursNotMet,
                hoursNotMetDeduction,
                overtimeHours: payCalc.overtimeHours,
                overtimePay: payCalc.overtimePay,
                restDayPay: payCalc.restDayPay,
                publicHolidayPay: payCalc.publicHolidayPay,
                advanceTotal,
                totalPay,
                netPay,
            });
        }
    }
}

export function createPayrollDomainService(repo: PayrollSyncRepository): PayrollDomainService {
    return new PayrollDomainServiceImpl(repo);
}
