import { type employmentTable, type payrollVoucherTable } from "@/db/schema";
import type { AdhocLineItem } from "@/db/tables/payrollVoucherTable";
import { calculatePay } from "@/utils/payroll/payroll-utils";

import { computeAdhocTotal } from "@/services/payroll/adhoc-line-items";
import {
    calculateVoucherAmounts,
    clampHoursNotMet,
} from "@/services/payroll/payroll-voucher-amounts";

type DraftVoucherEmploymentSnapshot = Pick<
    typeof employmentTable.$inferSelect,
    | "employmentType"
    | "employmentArrangement"
    | "shiftPattern"
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
    adhoc?: AdhocLineItem[];
}): Pick<
    typeof payrollVoucherTable.$inferInsert,
    | "employmentType"
    | "employmentArrangement"
    | "shiftPattern"
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
    | "adhoc"
    | "subTotal"
    | "grandTotal"
    | "paymentMethod"
    | "payNowPhone"
    | "bankAccountNumber"
> {
    const {
        employment,
        totalHoursWorked,
        restDays,
        publicHolidays,
        advanceTotal,
        adhoc = [],
    } = input;
    const adhocTotal = computeAdhocTotal(adhoc);

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
            adhocTotal,
        });

    return {
        employmentType: employment.employmentType,
        employmentArrangement: employment.employmentArrangement,
        shiftPattern: employment.shiftPattern,
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
        adhoc,
        subTotal,
        grandTotal,
        paymentMethod: employment.paymentMethod,
        payNowPhone: employment.payNowPhone,
        bankAccountNumber: employment.bankAccountNumber,
    };
}
