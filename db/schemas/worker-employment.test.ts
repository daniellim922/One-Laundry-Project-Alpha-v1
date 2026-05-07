import { describe, expect, it } from "vitest";

import { workerUpsertSchema } from "@/db/schemas/worker-employment";

describe("workerUpsertSchema", () => {
    it("parses payloads that lose undefined-valued keys via JSON (Server Action serialization)", () => {
        const foreignWorkerFullTimePayload = {
            name: "Ding Chun Rong",
            nric: "",
            email: "",
            phone: "",
            status: "Active",
            employmentType: "Full Time",
            employmentArrangement: "Foreign Worker",
            shiftPattern: "Day Shift",
            countryOfOrigin: "China",
            race: "Chinese",
            cpf: "",
            monthlyPay: "4000",
            hourlyRate: "8",
            restDayRate: "88.76",
            minimumWorkingHours: "260",
            paymentMethod: "PayNow",
            payNowPhone: "6586086736",
            bankAccountNumber: "",
        };

        const first = workerUpsertSchema.safeParse(foreignWorkerFullTimePayload);
        expect(first.success, JSON.stringify(first)).toBe(true);
        if (!first.success) return;

        expect(first.data.cpf).toBeUndefined();

        const wire = JSON.parse(JSON.stringify(first.data)) as Record<
            string,
            unknown
        >;
        expect("cpf" in wire).toBe(false);

        const second = workerUpsertSchema.safeParse(wire);
        expect(second.success, JSON.stringify(second)).toBe(true);
    });

    it("parses part-time payloads after stripping several optional numeric columns", () => {
        const partTimePayload = {
            name: "Part Timer",
            nric: "",
            email: "",
            phone: "",
            status: "Active",
            employmentType: "Part Time",
            employmentArrangement: "Local Worker",
            shiftPattern: "Day Shift",
            countryOfOrigin: "",
            race: "",
            cpf: "",
            monthlyPay: "",
            hourlyRate: "12.5",
            restDayRate: "",
            minimumWorkingHours: "",
            paymentMethod: "Cash",
            payNowPhone: "",
            bankAccountNumber: "",
        };

        const first = workerUpsertSchema.safeParse(partTimePayload);
        expect(first.success, JSON.stringify(first)).toBe(true);
        if (!first.success) return;

        expect(first.data.monthlyPay).toBeUndefined();
        expect(first.data.restDayRate).toBeUndefined();
        expect(first.data.minimumWorkingHours).toBeUndefined();

        const wire = JSON.parse(JSON.stringify(first.data)) as Record<
            string,
            unknown
        >;
        expect("monthlyPay" in wire).toBe(false);
        expect("restDayRate" in wire).toBe(false);
        expect("minimumWorkingHours" in wire).toBe(false);

        const second = workerUpsertSchema.safeParse(wire);
        expect(second.success, JSON.stringify(second)).toBe(true);
    });
});
