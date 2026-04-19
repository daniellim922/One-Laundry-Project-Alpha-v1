"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import type { PublicHolidayYearInput } from "@/db/schemas/public-holiday";
import {
    savePublicHolidaysForYear,
} from "@/services/payroll/public-holiday-calendar";

export async function savePublicHolidayYear(input: PublicHolidayYearInput) {
    await requireCurrentDashboardUser();

    const result = await savePublicHolidaysForYear(input);
    if ("error" in result) {
        return result;
    }

    revalidatePath("/dashboard/payroll/public-holidays");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    for (const payrollId of result.affectedPayrollIds) {
        revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
        revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    }
    return result;
}
