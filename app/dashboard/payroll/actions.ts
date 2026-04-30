"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";

import {
    createPayrollRecords,
    updatePayrollRecord,
} from "@/services/payroll/save-payroll";

function toDateString(val: string): string {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
}

export async function createPayrolls(formData: FormData) {
    await requireCurrentDashboardUser();

    const result = await createPayrollRecords({
        workerIds: formData.getAll("workerId") as string[],
        periodStart: toDateString(formData.get("periodStart") as string),
        periodEnd: toDateString(formData.get("periodEnd") as string),
        payrollDate: toDateString(formData.get("payrollDate") as string),
    });
    if ("error" in result) {
        return result;
    }

    if (result.created > 0) {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");
    }
    return result;
}

export async function updatePayroll(payrollId: string, formData: FormData) {
    await requireCurrentDashboardUser();

    const result = await updatePayrollRecord({
        payrollId,
        periodStart: toDateString(formData.get("periodStart") as string),
        periodEnd: toDateString(formData.get("periodEnd") as string),
        payrollDate: toDateString(formData.get("payrollDate") as string),
    });
    if ("error" in result) {
        return result;
    }

    revalidatePath(`/dashboard/payroll/${payrollId}/breakdown`);
    revalidatePath(`/dashboard/payroll/${payrollId}/summary`);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return result;
}
