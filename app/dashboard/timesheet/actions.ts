"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { AttendRecordOutput } from "@/lib/parse-attendrecord";
import { calculateHoursFromDateTimes } from "@/lib/payroll-utils";
import { timesheetTable } from "@/db/tables/payroll/timesheetTable";
import { workerTable } from "@/db/tables/payroll/workerTable";
import { recalculateVouchersForWorker } from "@/app/dashboard/payroll/actions";

function isoNow(): Date {
    return new Date();
}

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

/** Convert DD/MM/YYYY to YYYY-MM-DD for DB storage */
function ddMmYyyyToIso(val: string): string {
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return "";
    const [, day, month, year] = m;
    const d = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? "" : d;
}

export async function createTimesheetEntry(formData: FormData) {
    const workerId = formData.get("workerId") as string;
    const dateRaw = formData.get("date");
    const date = dateRaw != null ? toDateString(dateRaw as string) : "";
    const dateIn = formDate(formData, "dateIn") || date;
    const dateOut = formDate(formData, "dateOut") || dateIn;
    const timeIn = toTimeString(formData.get("timeIn") as string);
    const timeOut = toTimeString(formData.get("timeOut") as string);

    if (!workerId || !dateIn || !dateOut || !timeIn || !timeOut) {
        return { error: "Missing required fields" };
    }

    const hours = calculateHoursFromDateTimes(dateIn, timeIn, dateOut, timeOut);

    await db.insert(timesheetTable).values({
        workerId,
        dateIn,
        timeIn,
        dateOut,
        timeOut,
        hours,
        createdAt: isoNow(),
        updatedAt: isoNow(),
    });

    await recalculateVouchersForWorker(workerId);

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");
    return { success: true };
}

export async function updateTimesheetEntry(id: string, formData: FormData) {
    const workerId = formData.get("workerId") as string;
    const dateIn = formDate(formData, "dateIn");
    const dateOut = formDate(formData, "dateOut");
    const timeIn = toTimeString(formData.get("timeIn") as string);
    const timeOut = toTimeString(formData.get("timeOut") as string);

    if (!id || !workerId || !dateIn || !dateOut || !timeIn || !timeOut) {
        return { error: "Missing required fields" };
    }

    const [oldEntry] = await db
        .select({
            workerId: timesheetTable.workerId,
            status: timesheetTable.status,
        })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    if (!oldEntry) {
        return { error: "Timesheet entry not found" };
    }
    if (oldEntry.status === "paid") {
        return { error: "Paid timesheet entries cannot be edited" };
    }

    const hours = calculateHoursFromDateTimes(dateIn, timeIn, dateOut, timeOut);

    await db
        .update(timesheetTable)
        .set({
            workerId,
            dateIn,
            timeIn,
            dateOut,
            timeOut,
            hours,
            updatedAt: isoNow(),
        })
        .where(eq(timesheetTable.id, id));

    await recalculateVouchersForWorker(workerId);
    if (oldEntry && oldEntry.workerId !== workerId) {
        await recalculateVouchersForWorker(oldEntry.workerId);
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");
    return { success: true };
}

export async function deleteTimesheetEntry(id: string) {
    if (!id) return { error: "Missing id" };

    const [entry] = await db
        .select({ workerId: timesheetTable.workerId })
        .from(timesheetTable)
        .where(eq(timesheetTable.id, id))
        .limit(1);

    await db.delete(timesheetTable).where(eq(timesheetTable.id, id));

    if (entry) await recalculateVouchersForWorker(entry.workerId);

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");
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
            createdAt: isoNow(),
            updatedAt: isoNow(),
        });
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetTable).values(toInsert);

        const affectedWorkerIds = [...new Set(toInsert.map((r) => r.workerId))];
        for (const wid of affectedWorkerIds) {
            await recalculateVouchersForWorker(wid);
        }
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");

    return {
        imported: toInsert.length,
        errors: errors.length > 0 ? errors : undefined,
    };
}

export async function importAttendRecordTimesheet(data: AttendRecordOutput) {
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

    for (const worker of data.workers) {
        const workerId = nameToId.get(worker.name.toLowerCase().trim());
        if (!workerId) {
            errors.push(`Unknown worker "${worker.name}"`);
            continue;
        }

        for (const d of worker.dates) {
            const dateIn = ddMmYyyyToIso(d.dateIn);
            const dateOut = ddMmYyyyToIso(d.dateOut);
            if (!dateIn || !dateOut) {
                errors.push(`Invalid date for ${worker.name}: ${d.dateIn}`);
                continue;
            }

            const timeIn = toTimeString(d.timeIn);
            const timeOutRaw = String(d.timeOut ?? "").trim();
            const timeOut =
                !timeOutRaw || /^\s+$/.test(timeOutRaw)
                    ? "23:59:59"
                    : toTimeString(d.timeOut);

            const hours =
                typeof d.hours === "number" && d.hours >= 0
                    ? d.hours
                    : calculateHoursFromDateTimes(
                          dateIn,
                          timeIn,
                          dateOut,
                          timeOut,
                      );

            toInsert.push({
                workerId,
                dateIn,
                timeIn,
                dateOut,
                timeOut,
                hours,
                createdAt: isoNow(),
                updatedAt: isoNow(),
            });
        }
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetTable).values(toInsert);

        const affectedWorkerIds = [...new Set(toInsert.map((r) => r.workerId))];
        for (const wid of affectedWorkerIds) {
            await recalculateVouchersForWorker(wid);
        }
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");

    return {
        imported: toInsert.length,
        errors: errors.length > 0 ? errors : undefined,
    };
}
