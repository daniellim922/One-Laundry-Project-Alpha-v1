"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { timesheetEntriesTable } from "@/db/tables/timesheetEntriesTable";
import { workersTable } from "@/db/tables/workersTable";

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

export async function createTimesheetEntry(formData: FormData) {
    const workerId = formData.get("workerId") as string;
    const date = toDateString(formData.get("date") as string);
    const timeIn = toTimeString(formData.get("timeIn") as string);
    const timeOut = toTimeString(formData.get("timeOut") as string);

    if (!workerId || !date || !timeIn || !timeOut) {
        return { error: "Missing required fields" };
    }

    await db.insert(timesheetEntriesTable).values({
        workerId,
        date,
        timeIn,
        timeOut,
        createdAt: isoNow(),
        updatedAt: isoNow(),
    });

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");
    return { success: true };
}

type ImportRow = Record<string, unknown>;

export async function importTimesheetEntries(rows: ImportRow[]) {
    const workerNames = await db.select({ id: workersTable.id, name: workersTable.name }).from(workersTable);
    const nameToId = new Map(
        workerNames.map((w) => [w.name.toLowerCase().trim(), w.id]),
    );

    const toInsert: {
        workerId: string;
        date: string;
        timeIn: string;
        timeOut: string;
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
        const date = toDateString(
            (row.date ?? "") as string | number,
        );
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
        toInsert.push({
            workerId,
            date,
            timeIn,
            timeOut,
            createdAt: isoNow(),
            updatedAt: isoNow(),
        });
    }

    if (toInsert.length > 0) {
        await db.insert(timesheetEntriesTable).values(toInsert);
    }

    revalidatePath("/dashboard/timesheet");
    revalidatePath("/dashboard/payroll");

    return {
        imported: toInsert.length,
        errors: errors.length > 0 ? errors : undefined,
    };
}
