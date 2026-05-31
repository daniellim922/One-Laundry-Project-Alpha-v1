import { describe, expect, it } from "vitest";

import type { WorkerUpsertValues } from "@/db/schemas/worker-employment";
import { workerUpsertToRows } from "@/services/worker/worker-upsert-rows";

function buildWorkerUpsertValues(
    overrides: Partial<WorkerUpsertValues> = {},
): WorkerUpsertValues {
    return {
        name: "Alice",
        email: "alice@example.com",
        phone: "81234567",
        status: "Active",
        countryOfOrigin: "Singapore",
        race: "Chinese",
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        shiftPattern: "Day Shift",
        cpf: 320,
        monthlyPay: 2200,
        hourlyRate: 9,
        restDayRate: 80,
        minimumWorkingHours: 240,
        paymentMethod: "Cash",
        payNowPhone: "",
        bankAccountNumber: "",
        ...overrides,
    };
}

describe("workerUpsertToRows", () => {
    it("nulls CPF for foreign workers", () => {
        const { employment } = workerUpsertToRows(
            buildWorkerUpsertValues({
                employmentArrangement: "Foreign Worker",
                cpf: 320,
            }),
        );

        expect(employment.cpf).toBeNull();
    });

    it("keeps CPF for local workers", () => {
        const { employment } = workerUpsertToRows(
            buildWorkerUpsertValues({
                employmentArrangement: "Local Worker",
                cpf: 320,
            }),
        );

        expect(employment.cpf).toBe(320);
    });

    it("stores PayNow phone only when payment method is PayNow", () => {
        const payNow = workerUpsertToRows(
            buildWorkerUpsertValues({
                paymentMethod: "PayNow",
                payNowPhone: "+65 9123 4567",
            }),
        );
        const cash = workerUpsertToRows(
            buildWorkerUpsertValues({
                paymentMethod: "Cash",
                payNowPhone: "+65 9123 4567",
            }),
        );

        expect(payNow.employment.payNowPhone).toBe("+65 9123 4567");
        expect(cash.employment.payNowPhone).toBeNull();
    });

    it("trims blank optional text fields to null", () => {
        const { worker, employment } = workerUpsertToRows(
            buildWorkerUpsertValues({
                name: "  Alice  ",
                email: "   ",
                phone: "",
                countryOfOrigin: "  ",
                race: undefined,
                bankAccountNumber: "  ",
            }),
        );

        expect(worker.name).toBe("Alice");
        expect(worker.email).toBeNull();
        expect(worker.phone).toBeNull();
        expect(worker.countryOfOrigin).toBeNull();
        expect(worker.race).toBeNull();
        expect(employment.bankAccountNumber).toBeNull();
    });
});
