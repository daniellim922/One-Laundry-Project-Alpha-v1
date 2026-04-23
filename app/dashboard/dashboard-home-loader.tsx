import { MonthlyPayrollCategoryStackedOverviewCard } from "@/components/dashboard/monthly-payroll-category-stacked-overview-card";

import { getPayrollMonthlyCategoryAggregates } from "./get-payroll-monthly-category-aggregates";

export async function DashboardHomeLoader() {
    const { rows, defaultYear, yearOptions } =
        await getPayrollMonthlyCategoryAggregates();

    return (
        <MonthlyPayrollCategoryStackedOverviewCard
            rows={rows}
            defaultYear={defaultYear}
            yearOptions={yearOptions}
            title="Monthly payroll by category"
            description="Settled payrolls by calendar month of payroll date: Part Time and Full Time foreign subtotals (named workers excluded from those buckets), subtotal for Alvis Ong and Ong Chong Wee, and employee CPF for Full Time local workers. Toggle categories in the list to change the stack."
            idPrefix="dashboard-payroll-categories"
            stackId="payrollCategories"
        />
    );
}
