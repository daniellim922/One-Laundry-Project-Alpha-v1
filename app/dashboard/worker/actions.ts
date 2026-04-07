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
import {
    synchronizeWorkerDraftPayrolls,
    synchronizeWorkerDraftPayrollsInTx,
} from "@/app/dashboard/payroll/actions";
import { requirePermission } from "@/utils/permissions/require-permission";
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

function coerceWorkerStatus(input: unknown): WorkerStatus {
    const s = (input ?? "Active").toString().trim();
    return s === "Inactive" ? "Inactive" : "Active";
}

type ActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

type WorkerHoursBulkUpdateInput = {
    updates: Array<{
        workerId: string;
        minimumWorkingHours: number;
    }>;
};

type WorkerHoursBulkUpdateResult = {
    updatedCount: number;
    failed: Array<{
        workerId: string;
        workerName: string;
        error: string;
    }>;
};

class MassEditWorkingHoursError extends Error {
    workerId: string;
    workerName: string;

    constructor(input: { workerId: string; workerName: string; error: string }) {
        super(input.error);
        this.workerId = input.workerId;
        this.workerName = input.workerName;
    }
}

export async function createWorker(formData: FormData): Promise<ActionResult> {
    const name = (formData.get("name") ?? "").toString().trim();
    if (!name) {
        return { success: false, error: "Name is required" };
    }

    const nric = (formData.get("nric") ?? "").toString().trim() || null;
    const email = (formData.get("email") ?? "").toString().trim() || null;
    const phone = (formData.get("phone") ?? "").toString().trim() || null;
    const status: InsertWorker["status"] = coerceWorkerStatus(
        formData.get("status"),
    );
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
    const status: InsertWorker["status"] = coerceWorkerStatus(
        formData.get("status"),
    );
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
    await requirePermission("Workers", "update");

    const updates = Array.isArray(input?.updates) ? input.updates : [];
    if (updates.length === 0) {
        return { updatedCount: 0, failed: [] };
    }

    let updatedCount = 0;
    const failed: WorkerHoursBulkUpdateResult["failed"] = [];

    for (const update of updates) {
        const workerId = update.workerId?.trim();
        const minimumWorkingHours = Number(update.minimumWorkingHours);

        if (!workerId) {
            failed.push({
                workerId: "",
                workerName: "Unknown worker",
                error: "Missing worker ID",
            });
            continue;
        }

        if (
            !Number.isFinite(minimumWorkingHours) ||
            minimumWorkingHours < 0
        ) {
            failed.push({
                workerId,
                workerName: "Unknown worker",
                error: "Minimum working hours must be a non-negative number",
            });
            continue;
        }

        try {
            await db.transaction(async (tx) => {
                const [worker] = await tx
                    .select({
                        id: workerTable.id,
                        name: workerTable.name,
                        status: workerTable.status,
                        employmentId: workerTable.employmentId,
                        employmentType: employmentTable.employmentType,
                    })
                    .from(workerTable)
                    .innerJoin(
                        employmentTable,
                        eq(workerTable.employmentId, employmentTable.id),
                    )
                    .where(eq(workerTable.id, workerId))
                    .limit(1);

                const workerName = worker?.name ?? "Unknown worker";
                if (!worker) {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Worker not found",
                    });
                }

                if (worker.status !== "Active") {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Only active workers can be updated",
                    });
                }

                if (worker.employmentType !== "Full Time") {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: "Only Full Time workers can be updated",
                    });
                }

                await tx
                    .update(employmentTable)
                    .set({
                        minimumWorkingHours,
                        updatedAt: new Date(),
                    })
                    .where(eq(employmentTable.id, worker.employmentId));

                const sync = await synchronizeWorkerDraftPayrollsInTx(tx, {
                    workerId,
                });
                if ("error" in sync) {
                    throw new MassEditWorkingHoursError({
                        workerId,
                        workerName,
                        error: sync.error,
                    });
                }
            });

            updatedCount += 1;
        } catch (error) {
            if (error instanceof MassEditWorkingHoursError) {
                failed.push({
                    workerId: error.workerId,
                    workerName: error.workerName,
                    error: error.message,
                });
                continue;
            }

            console.error("Error mass editing worker minimum hours", error);
            failed.push({
                workerId,
                workerName: "Unknown worker",
                error: "Failed to update worker minimum hours",
            });
        }
    }

    if (updatedCount > 0) {
        revalidatePath("/dashboard/worker");
        revalidatePath("/dashboard/worker/all");
        revalidatePath("/dashboard/payroll");
        revalidatePath("/dashboard/payroll/all");
        revalidatePath("/dashboard/payroll/[id]/summary", "page");
        revalidatePath("/dashboard/payroll/[id]/breakdown", "page");
    }

    return { updatedCount, failed };
}
