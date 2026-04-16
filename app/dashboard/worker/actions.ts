"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
    workerTable,
    type InsertWorker,
} from "@/db/tables/workerTable";
import {
    employmentTable,
    type InsertEmployment,
} from "@/db/tables/employmentTable";
import {
    synchronizeWorkerDraftPayrolls,
} from "@/services/payroll/synchronize-worker-draft-payrolls";
import {
    massUpdateWorkerMinimumWorkingHours as massUpdateWorkerMinimumWorkingHoursService,
    type WorkerHoursBulkUpdateInput,
    type WorkerHoursBulkUpdateResult,
} from "@/services/worker/mass-update-minimum-working-hours";
import type { WorkerStatus } from "@/types/status";

function isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const code = Reflect.get(error, "code");
    return code === "23505";
}

function isNricUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const constraint =
        (Reflect.get(error, "constraint") as string | undefined) ??
        (Reflect.get(error, "detail") as string | undefined) ??
        (Reflect.get(error, "message") as string | undefined) ??
        "";
    return (
        typeof constraint === "string" &&
        constraint.includes("worker_nric_unique")
    );
}

function toNumber(val: FormDataEntryValue | null): number | null {
    if (val == null) return null;
    const s = String(val).trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isNaN(n)) return null;
    return n;
}

function parseWorkerStatus(input: unknown): WorkerStatus | null {
    const s = input?.toString().trim();
    if (s === "Active" || s === "Inactive") return s;
    return null;
}

type ActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

export async function createWorker(formData: FormData): Promise<ActionResult> {
    const name = (formData.get("name") ?? "").toString().trim();
    if (!name) {
        return { success: false, error: "Name is required" };
    }

    const nric = (formData.get("nric") ?? "").toString().trim() || null;
    const email = (formData.get("email") ?? "").toString().trim() || null;
    const phone = (formData.get("phone") ?? "").toString().trim() || null;
    const status = parseWorkerStatus(formData.get("status"));
    if (!status) {
        return { success: false, error: "Invalid worker status" };
    }
    const countryOfOrigin =
        (formData.get("countryOfOrigin") ?? "").toString().trim() || null;
    const race = (formData.get("race") ?? "").toString().trim() || null;

    const employmentType = (
        formData.get("employmentType") ?? "Full Time"
    ).toString() as InsertEmployment["employmentType"];
    const employmentArrangement = (
        formData.get("employmentArrangement") ?? "Local Worker"
    ).toString() as InsertEmployment["employmentArrangement"];

    const cpf =
        employmentArrangement === "Local Worker"
            ? toNumber(formData.get("cpf"))
            : null;
    const monthlyPay = toNumber(formData.get("monthlyPay"));
    const hourlyRate = toNumber(formData.get("hourlyRate"));
    const restDayRate = toNumber(formData.get("restDayRate"));
    const minimumWorkingHours = toNumber(formData.get("minimumWorkingHours"));

    const paymentMethodRaw = (formData.get("paymentMethod") ?? "")
        .toString()
        .trim();
    const paymentMethod = (paymentMethodRaw ||
        null) as InsertEmployment["paymentMethod"];
    const payNowPhone =
        (formData.get("payNowPhone") ?? "").toString().trim() || null;
    const bankAccountNumber =
        (formData.get("bankAccountNumber") ?? "").toString().trim() || null;

    try {
        const [employment] = await db
            .insert(employmentTable)
            .values({
                employmentType,
                employmentArrangement,
                cpf,
                monthlyPay,
                minimumWorkingHours,
                hourlyRate,
                restDayRate,
                paymentMethod,
                payNowPhone,
                bankAccountNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
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
                nric,
                email,
                phone,
                status,
                countryOfOrigin,
                race,
                employmentId,
                createdAt: new Date(),
                updatedAt: new Date(),
            } satisfies InsertWorker)
            .returning({ id: workerTable.id });

        const workerId = worker?.id;
        if (!workerId) {
            return { success: false, error: "Failed to create worker" };
        }

        revalidatePath("/dashboard/worker");
        revalidatePath("/dashboard/worker/all");

        return { success: true, id: workerId };
    } catch (error) {
        if (isUniqueViolation(error) && isNricUniqueViolation(error)) {
            return { success: false, error: "NRIC already exists" };
        }
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

    const nric = (formData.get("nric") ?? "").toString().trim() || null;
    const email = (formData.get("email") ?? "").toString().trim() || null;
    const phone = (formData.get("phone") ?? "").toString().trim() || null;
    const status = parseWorkerStatus(formData.get("status"));
    if (!status) {
        return { success: false, error: "Invalid worker status" };
    }
    const countryOfOrigin =
        (formData.get("countryOfOrigin") ?? "").toString().trim() || null;
    const race = (formData.get("race") ?? "").toString().trim() || null;

    const employmentType = (
        formData.get("employmentType") ?? "Full Time"
    ).toString() as InsertEmployment["employmentType"];
    const employmentArrangement = (
        formData.get("employmentArrangement") ?? "Local Worker"
    ).toString() as InsertEmployment["employmentArrangement"];

    const cpf =
        employmentArrangement === "Local Worker"
            ? toNumber(formData.get("cpf"))
            : null;
    const monthlyPay = toNumber(formData.get("monthlyPay"));
    const hourlyRate = toNumber(formData.get("hourlyRate"));
    const restDayRate = toNumber(formData.get("restDayRate"));
    const minimumWorkingHours = toNumber(formData.get("minimumWorkingHours"));

    const paymentMethodRaw = (formData.get("paymentMethod") ?? "")
        .toString()
        .trim();
    const paymentMethod = (paymentMethodRaw ||
        null) as InsertEmployment["paymentMethod"];
    const payNowPhone =
        (formData.get("payNowPhone") ?? "").toString().trim() || null;
    const bankAccountNumber =
        (formData.get("bankAccountNumber") ?? "").toString().trim() || null;

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
                cpf,
                monthlyPay,
                minimumWorkingHours,
                hourlyRate,
                restDayRate,
                paymentMethod,
                payNowPhone,
                bankAccountNumber,
                updatedAt: new Date(),
            })
            .where(eq(employmentTable.id, employmentId));

        await db
            .update(workerTable)
            .set({
                name,
                nric,
                email,
                phone,
                status,
                countryOfOrigin,
                race,
                updatedAt: new Date(),
            })
            .where(eq(workerTable.id, id));

        const sync = await synchronizeWorkerDraftPayrolls({ workerId: id });
        if ("error" in sync) {
            return { success: false, error: sync.error };
        }

        revalidatePath("/dashboard/worker");
        revalidatePath("/dashboard/worker/all");
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");
        revalidatePath("/dashboard/payroll/[id]/summary", "page");
        revalidatePath("/dashboard/payroll/[id]/breakdown", "page");

        return { success: true, id };
    } catch (error) {
        if (isUniqueViolation(error) && isNricUniqueViolation(error)) {
            return { success: false, error: "NRIC already exists" };
        }
        console.error("Error updating worker", error);
        return { success: false, error: "Failed to update worker" };
    }
}

export async function massUpdateWorkerMinimumWorkingHours(
    input: WorkerHoursBulkUpdateInput,
): Promise<WorkerHoursBulkUpdateResult> {
    const result = await massUpdateWorkerMinimumWorkingHoursService(input);

    if (result.updatedCount > 0) {
        revalidatePath("/dashboard/worker");
        revalidatePath("/dashboard/worker/all");
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");
        revalidatePath("/dashboard/payroll/[id]/summary", "page");
        revalidatePath("/dashboard/payroll/[id]/breakdown", "page");
    }

    return result;
}
