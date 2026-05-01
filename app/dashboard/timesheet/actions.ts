"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";

import {
    createTimesheetEntryRecord,
    updateTimesheetEntryRecord,
} from "@/services/timesheet/save-timesheet-entry";

import { dateToLocalIsoYmd } from "@/utils/time/calendar-date";
import { toTimesheetWireTimeHms } from "@/utils/time/hm-time";

function toDateString(val: string | number): string {
    const v = val;
    if (typeof v === "number" && v > 0) {
        const d = new Date((v - 25569) * 86400 * 1000);
        return dateToLocalIsoYmd(d);
    }
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return "";
    return dateToLocalIsoYmd(d);
}

function formDate(formData: FormData, key: string): string {
    const raw = formData.get(key);
    if (raw == null) return "";
    return toDateString(raw as string);
}

export async function createTimesheetEntry(formData: FormData) {
    await requireCurrentDashboardUser();

    const workerId = formData.get("workerId") as string;
    const dateRaw = formData.get("date");
    const date = dateRaw != null ? toDateString(dateRaw as string) : "";
    const dateIn = formDate(formData, "dateIn") || date;
    const dateOut = formDate(formData, "dateOut") || dateIn;
    const timeIn = toTimesheetWireTimeHms(formData.get("timeIn") as string);
    const timeOut = toTimesheetWireTimeHms(formData.get("timeOut") as string);
    const result = await createTimesheetEntryRecord({
        workerId,
        dateIn,
        dateOut,
        timeIn,
        timeOut,
    });
    if ("error" in result) {
        return result;
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

export async function updateTimesheetEntry(id: string, formData: FormData) {
    await requireCurrentDashboardUser();

    const workerId = formData.get("workerId") as string;
    const dateIn = formDate(formData, "dateIn");
    const dateOut = formDate(formData, "dateOut");
    const timeIn = toTimesheetWireTimeHms(formData.get("timeIn") as string);
    const timeOut = toTimesheetWireTimeHms(formData.get("timeOut") as string);
    const result = await updateTimesheetEntryRecord({
        id,
        workerId,
        dateIn,
        dateOut,
        timeIn,
        timeOut,
    });
    if ("error" in result) {
        return result;
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}
