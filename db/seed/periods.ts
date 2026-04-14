export type SeedPeriod = {
    key: string;
    monthIndex: number;
    year: number;
    month: number;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    restDays: number;
};

function pad(value: number): string {
    return value.toString().padStart(2, "0");
}

function createUtcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
    return [
        date.getUTCFullYear(),
        pad(date.getUTCMonth() + 1),
        pad(date.getUTCDate()),
    ].join("-");
}

function lastDayOfMonth(year: number, month: number): number {
    return createUtcDate(year, month + 1, 0).getUTCDate();
}

function countSundays(year: number, month: number): number {
    const lastDay = lastDayOfMonth(year, month);
    let sundays = 0;

    for (let day = 1; day <= lastDay; day += 1) {
        if (createUtcDate(year, month, day).getUTCDay() === 0) {
            sundays += 1;
        }
    }

    return sundays;
}

function nextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 12) {
        return { year: year + 1, month: 1 };
    }

    return { year, month: month + 1 };
}

function generateSeedPeriods(): SeedPeriod[] {
    const periods: SeedPeriod[] = [];
    let year = 2025;
    let month = 4;
    let monthIndex = 0;

    while (year < 2026 || (year === 2026 && month <= 3)) {
        const { year: payrollYear, month: payrollMonth } = nextMonth(year, month);
        const lastDay = lastDayOfMonth(year, month);
        const payrollDateDay = Math.min(5, lastDayOfMonth(payrollYear, payrollMonth));

        periods.push({
            key: `${year}-${pad(month)}`,
            monthIndex,
            year,
            month,
            periodStart: `${year}-${pad(month)}-01`,
            periodEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
            payrollDate: `${payrollYear}-${pad(payrollMonth)}-${pad(payrollDateDay)}`,
            restDays: countSundays(year, month),
        });

        ({ year, month } = nextMonth(year, month));
        monthIndex += 1;
    }

    return periods;
}

export const seedPeriods = generateSeedPeriods();
