"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type InsertWorker,
} from "@/db/tables/payroll/workerTable";
import {
    employmentTable,
    type InsertEmployment,
} from "@/db/tables/payroll/employmentTable";

function isoNow(): Date {
    return new Date();
}

function toInt(val: FormDataEntryValue | null): number | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isNaN(n)) return null;
    return Math.trunc(n);
}

type ActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

export async function createWorker(formData: FormData): Promise<ActionResult> {
    const name = (formData.get("name") ?? "").toString().trim();
    if (!name) {
        return { success: false, error: "Name is required" };
    }

    const email = (formData.get("email") ?? "").toString().trim() || null;
    const phone = (formData.get("phone") ?? "").toString().trim() || null;
    const status =
        (formData.get("status") ?? "Active").toString().trim() || "Active";
    const countryOfOrigin =
        (formData.get("countryOfOrigin") ?? "").toString().trim() || null;
    const race = (formData.get("race") ?? "").toString().trim() || null;

    const employmentType = (
        formData.get("employmentType") ?? "Full Time"
    ).toString() as InsertEmployment["employmentType"];
    const employmentArrangement = (
        formData.get("employmentArrangement") ?? "Local Worker"
    ).toString() as InsertEmployment["employmentArrangement"];

    const monthlyPay = toInt(formData.get("monthlyPay"));
    const hourlyPay = toInt(formData.get("hourlyPay"));
    const restDayPay = toInt(formData.get("restDayPay"));
    const minimumWorkingHours = toInt(formData.get("minimumWorkingHours"));

    const paymentMethodRaw = (formData.get("paymentMethod") ?? "")
        .toString()
        .trim();
    const paymentMethod = (paymentMethodRaw ||
        null) as InsertEmployment["paymentMethod"];
    const payNowPhone =
        (formData.get("payNowPhone") ?? "").toString().trim() || null;
    const bankAccountNumber =
        (formData.get("bankAccountNumber") ?? "").toString().trim() || null;

    const now = isoNow();

    try {
        const [employment] = await db
            .insert(employmentTable)
            .values({
                employmentType,
                employmentArrangement,
                monthlyPay,
                workingHours: minimumWorkingHours,
                hourlyPay,
                restDayPay,
                paymentMethod,
                payNowPhone,
                bankAccountNumber,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: employmentTable.id });

        const employmentId = employment?.id;
        if (!employmentId) {
            return { success: false, error: "Failed to create employment" };
        }

        const [worker] = await db
            .insert(workerTable)
            .values({
                name,
                email,
                phone,
                status,
                countryOfOrigin,
                race,
                employmentId,
                createdAt: now,
                updatedAt: now,
            } satisfies InsertWorker)
            .returning({ id: workerTable.id });

        const workerId = worker?.id;
        if (!workerId) {
            return { success: false, error: "Failed to create worker" };
        }

        revalidatePath("/dashboard/workers");

        return { success: true, id: workerId };
    } catch (error) {
        console.error("Error creating worker", error);
        return { success: false, error: "Failed to create worker" };
    }
}

export async function updateWorker(
    id: string,
    formData: FormData,
): Promise<ActionResult> {
    if (!id) {
        return { success: false, error: "Worker ID is required" };
    }

    const name = (formData.get("name") ?? "").toString().trim();
    if (!name) {
        return { success: false, error: "Name is required" };
    }

    const email = (formData.get("email") ?? "").toString().trim() || null;
    const phone = (formData.get("phone") ?? "").toString().trim() || null;
    const status =
        (formData.get("status") ?? "Active").toString().trim() || "Active";
    const countryOfOrigin =
        (formData.get("countryOfOrigin") ?? "").toString().trim() || null;
    const race = (formData.get("race") ?? "").toString().trim() || null;

    const employmentType = (
        formData.get("employmentType") ?? "Full Time"
    ).toString() as InsertEmployment["employmentType"];
    const employmentArrangement = (
        formData.get("employmentArrangement") ?? "Local Worker"
    ).toString() as InsertEmployment["employmentArrangement"];

    const monthlyPay = toInt(formData.get("monthlyPay"));
    const hourlyPay = toInt(formData.get("hourlyPay"));
    const restDayPay = toInt(formData.get("restDayPay"));
    const minimumWorkingHours = toInt(formData.get("minimumWorkingHours"));

    const paymentMethodRaw = (formData.get("paymentMethod") ?? "")
        .toString()
        .trim();
    const paymentMethod = (paymentMethodRaw ||
        null) as InsertEmployment["paymentMethod"];
    const payNowPhone =
        (formData.get("payNowPhone") ?? "").toString().trim() || null;
    const bankAccountNumber =
        (formData.get("bankAccountNumber") ?? "").toString().trim() || null;

    const now = isoNow();

    try {
        const [existing] = await db
            .select({
                id: workerTable.id,
                employmentId: workerTable.employmentId,
            })
            .from(workerTable)
            .where(eq(workerTable.id, id))
            .limit(1);

        if (!existing) {
            return { success: false, error: "Worker not found" };
        }

        const employmentId = existing.employmentId;

        await db
            .update(employmentTable)
            .set({
                employmentType,
                employmentArrangement,
                monthlyPay,
                workingHours: minimumWorkingHours,
                hourlyPay,
                restDayPay,
                paymentMethod,
                payNowPhone,
                bankAccountNumber,
                updatedAt: now,
            })
            .where(eq(employmentTable.id, employmentId));

        await db
            .update(workerTable)
            .set({
                name,
                email,
                phone,
                status,
                countryOfOrigin,
                race,
                updatedAt: now,
            })
            .where(eq(workerTable.id, id));

        revalidatePath("/dashboard/workers");

        return { success: true, id };
    } catch (error) {
        console.error("Error updating worker", error);
        return { success: false, error: "Failed to update worker" };
    }
}

