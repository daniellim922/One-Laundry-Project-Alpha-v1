"use server";

import { revalidatePath } from "next/cache";

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
import { calculateHoursFromDateTimes } from "@/utils/payroll/payroll-utils";

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

export async function deleteTimesheetEntry(id: string) {
    const result = await deleteTimesheetEntryRecord({ id });
    if (!result.success) {
        return { error: result.error };
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return { success: true };
}

type ImportRow = Record<string, unknown>;

export async function importTimesheetEntries(rows: ImportRow[]) {
    const workerNames = await db
        .select({ id: workerTable.id, name: workerTable.name })
        .from(workerTable);
    const nameToId = new Map(
        workerNames.map((w) => [w.name.toLowerCase().trim(), w.id]),
    );

    const toInsert: {
        workerId: string;
        dateIn: string;
        timeIn: string;
        dateOut: string;
        timeOut: string;
        hours: number;
        createdAt: Date;
        updatedAt: Date;
    }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const workerName = String(
            row.worker_name ?? row.name ?? row.workerName ?? "",
        );
        const workerId = nameToId.get(workerName.toLowerCase().trim());
        if (!workerId) {
            errors.push(`Row ${i + 1}: Unknown worker "${workerName}"`);
            continue;
        }
        const date = toDateString((row.date ?? "") as string | number);
        const timeIn = toTimeString(
            String(row.time_in ?? row.timeIn ?? "09:00"),
        );
        const timeOut = toTimeString(
            String(row.time_out ?? row.timeOut ?? "17:00"),
        );
        if (!date || date === "Invalid Date") {
            errors.push(`Row ${i + 1}: Invalid date`);
            continue;
        }
        const hours = calculateHoursFromDateTimes(date, timeIn, date, timeOut);
        toInsert.push({
            workerId,
            dateIn: date,
            timeIn,
            dateOut: date,
            timeOut,
            hours,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetTable).values(toInsert);

        const affectedWorkerIds = [...new Set(toInsert.map((r) => r.workerId))];
        for (const wid of affectedWorkerIds) {
            const sync = await synchronizeWorkerDraftPayrolls({
                workerId: wid,
            });
            if ("error" in sync) {
                return {
                    imported: toInsert.length,
                    errors: [...errors, sync.error],
                };
            }
        }
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");

    return {
        imported: toInsert.length,
        errors: errors.length > 0 ? errors : undefined,
    };
}

export async function importAttendRecordTimesheet(data: AttendRecordOutput) {
    const result = await importAttendRecordTimesheetRecord(data);

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/timesheet/all");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard/payroll/all");
    return result;
}
