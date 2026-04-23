import { type employmentTable, type payrollVoucherTable } from "@/db/schema";
import { calculatePay } from "@/utils/payroll/payroll-utils";

import {
    calculateVoucherAmounts,
    clampHoursNotMet,
} from "@/services/payroll/payroll-voucher-amounts";

type DraftVoucherEmploymentSnapshot = Pick<
    typeof employmentTable.$inferSelect,
    | "employmentType"
    | "employmentArrangement"
    | "minimumWorkingHours"
    | "monthlyPay"
    | "hourlyRate"
    | "restDayRate"
    | "cpf"
    | "paymentMethod"
    | "payNowPhone"
    | "bankAccountNumber"
>;

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}

export function buildDraftPayrollVoucherValues(input: {
    employment: DraftVoucherEmploymentSnapshot;
    totalHoursWorked: number;
    restDays: number;
    publicHolidays: number;
    advanceTotal: number;
}): Pick<
    typeof payrollVoucherTable.$inferInsert,
    | "employmentType"
    | "employmentArrangement"
    | "monthlyPay"
    | "minimumWorkingHours"
    | "totalHoursWorked"
    | "hoursNotMet"
    | "hoursNotMetDeduction"
    | "overtimeHours"
    | "hourlyRate"
    | "overtimePay"
    | "restDayRate"
    | "restDays"
    | "restDayPay"
    | "publicHolidays"
    | "publicHolidayPay"
    | "cpf"
    | "advance"
    | "subTotal"
    | "grandTotal"
    | "paymentMethod"
    | "payNowPhone"
    | "bankAccountNumber"
> {
    const { employment, totalHoursWorked, restDays, publicHolidays, advanceTotal } =
        input;

    const payCalc = calculatePay({
        employmentType: employment.employmentType,
        totalHoursWorked,
        minimumWorkingHours: employment.minimumWorkingHours,
        monthlyPay: employment.monthlyPay,
        hourlyRate: employment.hourlyRate,
        restDayRate: employment.restDayRate,
        restDays,
        publicHolidays,
    });

    const hoursNotMet =
        employment.minimumWorkingHours != null
            ? clampHoursNotMet(
                  roundHours(totalHoursWorked - employment.minimumWorkingHours),
              )
            : null;

    const { hoursNotMetDeduction, subTotal, grandTotal } =
        calculateVoucherAmounts({
            hoursNotMet,
            hourlyRate: employment.hourlyRate,
            basePayTotal: payCalc.earningsTotal,
            cpf: employment.cpf,
            advance: advanceTotal,
        });

    return {
        employmentType: employment.employmentType,
        employmentArrangement: employment.employmentArrangement,
        monthlyPay: employment.monthlyPay,
        minimumWorkingHours: employment.minimumWorkingHours,
        totalHoursWorked,
        hoursNotMet,
        hoursNotMetDeduction,
        overtimeHours: payCalc.overtimeHours,
        hourlyRate: employment.hourlyRate,
        overtimePay: payCalc.overtimePay,
        restDayRate: employment.restDayRate,
        restDays,
        restDayPay: payCalc.restDayPay,
        publicHolidays,
        publicHolidayPay: payCalc.publicHolidayPay,
        cpf: employment.cpf,
        advance: advanceTotal,
        subTotal,
        grandTotal,
        paymentMethod: employment.paymentMethod,
        payNowPhone: employment.payNowPhone,
        bankAccountNumber: employment.bankAccountNumber,
    };
}
