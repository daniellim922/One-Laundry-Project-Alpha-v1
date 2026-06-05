export type VoucherLineItem = {
    description: string;
    qty?: number;
    unit?: string;
    rate?: number;
    amount: number;
};

export type VoucherLineItemsInput = {
    employmentType: string | null;
    monthlyPay: number | null;
    hourlyRate: number | null;
    totalHoursWorked: number | null;
    hoursNotMet?: number | null;
    hoursNotMetDeduction?: number | null;
    overtimeHours: number | null;
    overtimePay: number | null;
    restDays: number | null;
    restDayRate: number | null;
    restDayPay: number | null;
    publicHolidays: number | null;
    publicHolidayPay: number | null;
    cpf: number | null;
    advance?: number | null;
    adhoc?: Array<{ name: string; amount: number }>;
    subTotal: number | null;
    grandTotal: number | null;
};

function hasPositiveQuantity(
    value: number | null | undefined,
): value is number {
    return value != null && value > 0;
}

function hasNonZeroAmount(value: number | null | undefined): boolean {
    return (value ?? 0) !== 0;
}

export function buildVoucherLineItems(voucher: VoucherLineItemsInput) {
    const earnings: VoucherLineItem[] = [];
    const deductions: VoucherLineItem[] = [];
    const isPartTime = voucher.employmentType === "Part Time";

    if (isPartTime) {
        earnings.push({
            description: "Hourly Rate",
            qty: voucher.totalHoursWorked ?? 0,
            unit: "hrs",
            rate: voucher.hourlyRate ?? 0,
            amount:
                Math.round(
                    (voucher.totalHoursWorked ?? 0) *
                        (voucher.hourlyRate ?? 0) *
                        100,
                ) / 100,
        });
    } else {
        earnings.push({
            description: "Monthly Pay",
            amount: voucher.monthlyPay ?? 0,
        });

        if (
            hasPositiveQuantity(voucher.overtimeHours) &&
            hasNonZeroAmount(voucher.overtimePay)
        ) {
            earnings.push({
                description: "Overtime",
                qty: voucher.overtimeHours,
                unit: "hrs",
                rate: voucher.hourlyRate ?? 0,
                amount: voucher.overtimePay ?? 0,
            });
        }

        if (
            hasPositiveQuantity(voucher.restDays) &&
            voucher.restDayRate != null &&
            hasNonZeroAmount(voucher.restDayPay)
        ) {
            earnings.push({
                description: "Rest-day premium",
                qty: voucher.restDays,
                unit: "day",
                rate: voucher.restDayRate,
                amount: voucher.restDayPay ?? 0,
            });
        }
    }

    if (
        hasPositiveQuantity(voucher.publicHolidays) &&
        voucher.restDayRate != null &&
        hasNonZeroAmount(voucher.publicHolidayPay)
    ) {
        earnings.push({
            description: "Public Holiday Pay",
            qty: voucher.publicHolidays,
            unit: "day",
            rate: voucher.restDayRate,
            amount: voucher.publicHolidayPay ?? 0,
        });
    }

    let hoursNotMetItem: VoucherLineItem | null = null;
    if (hasNonZeroAmount(voucher.hoursNotMetDeduction)) {
        hoursNotMetItem = {
            description: "Hours Not Met Deduction",
            qty: Math.abs(voucher.hoursNotMet ?? 0),
            unit: "hrs",
            rate: voucher.hourlyRate ?? 0,
            amount: voucher.hoursNotMetDeduction ?? 0,
        };
    }

    if (voucher.cpf != null && voucher.cpf > 0) {
        deductions.push({ description: "CPF", amount: -voucher.cpf });
    }
    if (voucher.advance != null && voucher.advance > 0) {
        deductions.push({
            description: "Advance Pay",
            amount: -voucher.advance,
        });
    }

    const adhocItems: VoucherLineItem[] = (voucher.adhoc ?? [])
        .filter((item) => item.amount !== 0)
        .map((item) => ({
            description: item.name,
            amount: item.amount,
        }));

    const grossPay = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = deductions.reduce(
        (sum, item) => sum + item.amount,
        0,
    );
    const subTotal =
        voucher.subTotal ?? grossPay + (hoursNotMetItem?.amount ?? 0);
    const grandTotal =
        voucher.grandTotal ?? voucher.subTotal ?? grossPay + totalDeductions;

    return {
        earnings,
        deductions,
        adhocItems,
        hoursNotMetItem,
        subTotal,
        grandTotal,
    };
}
