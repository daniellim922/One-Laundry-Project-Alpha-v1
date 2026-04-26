import type { WorkerWithEmployment } from "@/db/tables/workerTable";

/** Typical active worker row for form / table component tests. */
export function makeWorkerWithEmployment(
    overrides: Partial<WorkerWithEmployment> = {},
): WorkerWithEmployment {
    return {
        id: "worker-1",
        employmentId: "employment-1",
        name: "Existing Worker",
        nric: "S1234567A",
        email: "existing@example.com",
        phone: "81112222",
        status: "Active",
        countryOfOrigin: "Singapore",
        race: "Chinese",
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        cpf: 300,
        monthlyPay: 2100,
        hourlyRate: 10,
        restDayRate: 88,
        minimumWorkingHours: 240,
        paymentMethod: "Cash",
        payNowPhone: null,
        bankAccountNumber: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-02-01"),
        ...overrides,
    };
}
