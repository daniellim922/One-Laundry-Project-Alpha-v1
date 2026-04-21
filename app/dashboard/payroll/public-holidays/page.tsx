import { FormPageLayout } from "@/components/form-page-layout";
import {
    PUBLIC_HOLIDAY_MAX_YEAR,
    PUBLIC_HOLIDAY_MIN_YEAR,
} from "@/db/schemas/public-holiday";
import { listPublicHolidaysForYear } from "@/services/payroll/public-holiday-calendar";

import { PublicHolidayCalendarForm } from "./public-holiday-calendar-form";

function currentYear() {
    return new Date().getFullYear();
}

function resolveSelectedYear(rawYear: string | undefined) {
    const parsed = Number(rawYear);

    if (
        Number.isInteger(parsed) &&
        parsed >= PUBLIC_HOLIDAY_MIN_YEAR &&
        parsed <= PUBLIC_HOLIDAY_MAX_YEAR
    ) {
        return parsed;
    }

    return currentYear();
}

export default async function PayrollPublicHolidaysPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>;
}) {
    const { year } = await searchParams;
    const selectedYear = resolveSelectedYear(year);
    const holidays = await listPublicHolidaysForYear({ year: selectedYear });

    return (
        <FormPageLayout
            title="Public holidays"
            subtitle={
                <>
                    Manage the shared payroll holiday calendar one year at a
                    time. Saving replaces that year&apos;s list as a single
                    update. Source:{" "}
                    <a
                        href="https://www.mom.gov.sg/employment-practices/public-holidays"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2">
                        Ministry of Manpower public holidays
                    </a>
                    .
                </>
            }
            maxWidthClassName="max-w-5xl">
            <PublicHolidayCalendarForm
                key={selectedYear}
                year={selectedYear}
                holidays={holidays}
            />
        </FormPageLayout>
    );
}
