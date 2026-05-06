"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireCurrentDashboardUser } from "@/app/dashboard/_shared/auth";
import {
    formatWorkerUpsertZodError,
    workerUpsertSchema,
} from "@/db/schemas/worker-employment";
import {
    employmentTable,
    type InsertEmployment,
} from "@/db/tables/employmentTable";
import { workerTable, type InsertWorker } from "@/db/tables/workerTable";
import { db } from "@/lib/db";
import { synchronizeWorkerDraftPayrolls } from "@/services/payroll/synchronize-worker-draft-payrolls";

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

function trimToNull(s: string | null | undefined): string | null {
    if (s == null) return null;
    const t = s.trim();
    return t ? t : null;
}

type ActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

function parsedPayloadToRowValues(
    data: ReturnType<typeof workerUpsertSchema.parse>,
): {
    worker: Omit<
        InsertWorker,
        "id" | "employmentId" | "createdAt" | "updatedAt"
    >;
    employment: Omit<InsertEmployment, "id" | "createdAt" | "updatedAt">;
} {
    const paymentMethod = data.paymentMethod ?? null;
    const isPayNow = paymentMethod === "PayNow";

    const employment: Omit<InsertEmployment, "id" | "createdAt" | "updatedAt"> =
        {
            employmentType: data.employmentType,
            employmentArrangement: data.employmentArrangement,
            shiftPattern: data.shiftPattern,
            cpf:
                data.employmentArrangement === "Local Worker"
                    ? (data.cpf ?? null)
                    : null,
            monthlyPay: data.monthlyPay ?? null,
            minimumWorkingHours: data.minimumWorkingHours ?? null,
            hourlyRate: data.hourlyRate ?? null,
            restDayRate: data.restDayRate ?? null,
            paymentMethod,
            payNowPhone: isPayNow ? trimToNull(data.payNowPhone) : null,
            bankAccountNumber: trimToNull(data.bankAccountNumber),
        };

    const worker: Omit<
        InsertWorker,
        "id" | "employmentId" | "createdAt" | "updatedAt"
    > = {
        name: data.name.trim(),
        nric: trimToNull(data.nric),
        email: trimToNull(data.email),
        phone: trimToNull(data.phone),
        status: data.status,
        countryOfOrigin: trimToNull(data.countryOfOrigin),
        race: trimToNull(data.race),
    };

    return { worker, employment };
}

export async function createWorker(input: unknown): Promise<ActionResult> {
    await requireCurrentDashboardUser();

    const parsed = workerUpsertSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: formatWorkerUpsertZodError(parsed.error),
        };
    }

    const { worker, employment } = parsedPayloadToRowValues(parsed.data);

    try {
        const [employmentRow] = await db
            .insert(employmentTable)
            .values({
                ...employment,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning({ id: employmentTable.id });

        const employmentId = employmentRow?.id;
        if (!employmentId) {
            return { success: false, error: "Failed to create employment" };
        }

        const [workerRow] = await db
            .insert(workerTable)
            .values({
                ...worker,
                employmentId,
                createdAt: new Date(),
                updatedAt: new Date(),
            } satisfies InsertWorker)
            .returning({ id: workerTable.id });

        const workerId = workerRow?.id;
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
    input: unknown,
): Promise<ActionResult> {
    await requireCurrentDashboardUser();

    if (!id) {
        return { success: false, error: "Worker ID is required" };
    }

    const parsed = workerUpsertSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: formatWorkerUpsertZodError(parsed.error),
        };
    }

    const { worker, employment } = parsedPayloadToRowValues(parsed.data);

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
                ...employment,
                updatedAt: new Date(),
            })
            .where(eq(employmentTable.id, employmentId));

        await db
            .update(workerTable)
            .set({
                ...worker,
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
