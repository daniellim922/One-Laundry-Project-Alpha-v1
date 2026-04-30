export type SeedPeriod = {
    key: string;
    monthIndex: number;
    year: number;
    month: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
};

function pad(value: number): string {
    return value.toString().padStart(2, "0");
}

function createUtcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

function lastDayOfMonth(year: number, month: number): number {
    return createUtcDate(year, month + 1, 0).getUTCDate();
}

function nextMonth(
    year: number,
    month: number,
): { year: number; month: number } {
    if (month === 12) {
        return { year: year + 1, month: 1 };
    }

    return { year, month: month + 1 };
}

function generateMonthlySeedPeriods(input: {
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
}): SeedPeriod[] {
    const periods: SeedPeriod[] = [];
    let year = input.startYear;
    let month = input.startMonth;
    let monthIndex = 0;

    while (
        year < input.endYear ||
        (year === input.endYear && month <= input.endMonth)
    ) {
        const { year: payrollYear, month: payrollMonth } = nextMonth(
            year,
            month,
        );
        const lastDay = lastDayOfMonth(year, month);
        const payrollDateDay = Math.min(
            5,
            lastDayOfMonth(payrollYear, payrollMonth),
        );

        periods.push({
            key: `${year}-${pad(month)}`,
            monthIndex,
            year,
            month,
            periodStart: `${year}-${pad(month)}-01`,
            periodEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
            payrollDate: `${payrollYear}-${pad(payrollMonth)}-${pad(payrollDateDay)}`,
        });

        ({ year, month } = nextMonth(year, month));
        monthIndex += 1;
    }

    return periods;
}

export const settledHistoricalPayrollSeedPeriods = generateMonthlySeedPeriods({
    startYear: 2025,
    startMonth: 4,
    endYear: 2025,
    endMonth: 12,
});

const openTimesheetSeedPeriods = generateMonthlySeedPeriods({
    startYear: 2026,
    startMonth: 1,
    endYear: 2026,
    endMonth: 3,
});

export const timesheetSeedPeriods = [
    ...settledHistoricalPayrollSeedPeriods,
    ...openTimesheetSeedPeriods,
];
