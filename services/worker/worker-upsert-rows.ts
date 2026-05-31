import type { WorkerUpsertValues } from "@/db/schemas/worker-employment";
import type { InsertEmployment } from "@/db/tables/employmentTable";
import type { InsertWorker } from "@/db/tables/workerTable";

function trimToNull(s: string | null | undefined): string | null {
    if (s == null) return null;
    const t = s.trim();
    return t ? t : null;
}

export type WorkerUpsertRows = {
    worker: Omit<
        InsertWorker,
        "id" | "employmentId" | "createdAt" | "updatedAt"
    >;
    employment: Omit<InsertEmployment, "id" | "createdAt" | "updatedAt">;
};

export function workerUpsertToRows(data: WorkerUpsertValues): WorkerUpsertRows {
    const paymentMethod = data.paymentMethod ?? null;
    const isPayNow = paymentMethod === "PayNow";

    const employment: WorkerUpsertRows["employment"] = {
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

    const worker: WorkerUpsertRows["worker"] = {
        name: data.name.trim(),
        email: trimToNull(data.email),
        phone: trimToNull(data.phone),
        status: data.status,
        countryOfOrigin: trimToNull(data.countryOfOrigin),
        race: trimToNull(data.race),
    };

    return { worker, employment };
}
