"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import { timesheetTable } from "@/db/tables/timesheetTable";
import { workerTable } from "@/db/tables/workerTable";
import { db } from "@/lib/db";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";
import {
    createTimesheetEntryRecord,
    updateTimesheetEntryRecord,
} from "@/services/timesheet/save-timesheet-entry";
import { deleteTimesheetEntry as deleteTimesheetEntryRecord } from "@/services/timesheet/delete-timesheet-entry";
import { importAttendRecordTimesheet as importAttendRecordTimesheetRecord } from "@/services/timesheet/import-attend-record-timesheet";
import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

function toTimeString(val: string): string {
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
        const parts = s.split(":");
        const h = parts[0]!.padStart(2, "0");
        const m = parts[1]!.padStart(2, "0");
        const sec = parts[2] ?? "00";
        return `${h}:${m}:${sec}`;
    }
    return s;
}

function toDateString(val: string | number): string {
    const v = val;
    if (typeof v === "number" && v > 0) {
        const d = new Date((v - 25569) * 86400 * 1000);
        return d.toISOString().slice(0, 10);
    }
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
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
    const timeIn = toTimeString(formData.get("timeIn") as string);
    const timeOut = toTimeString(formData.get("timeOut") as string);
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
    const timeIn = toTimeString(formData.get("timeIn") as string);
    const timeOut = toTimeString(formData.get("timeOut") as string);
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

type ImportRow = Record<string, unknown>;
