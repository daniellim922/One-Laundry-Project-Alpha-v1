import { describe, expect, it } from "vitest";

import { workerUpsertSchema } from "@/db/schemas/worker-employment";

function expectSuccessfulParse<T>(
    result: { success: true; data: T } | { success: false; error: unknown },
): T {
    if (!result.success) {
        throw new Error(JSON.stringify(result));
    }
    return result.data;
}

describe("workerUpsertSchema", () => {
    const fullTimePayload = {
        name: "Ding Chun Rong",
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

    it("accepts zero hourly and rest-day rates for full-time workers with positive monthly pay", () => {
        const result = workerUpsertSchema.safeParse({
            ...fullTimePayload,
            hourlyRate: "0",
            restDayRate: "0",
        });

        const data = expectSuccessfulParse(result);

        expect(data.hourlyRate).toBe(0);
        expect(data.restDayRate).toBe(0);
    });

    it("omits identity-number fields from parsed worker payloads", () => {
        const data = expectSuccessfulParse(
            workerUpsertSchema.safeParse({
                ...fullTimePayload,
                identityNumber: "S1234567A",
            }),
        );

        expect("identityNumber" in data).toBe(false);
    });

    it("rejects zero monthly pay for full-time workers", () => {
        const result = workerUpsertSchema.safeParse({
            ...fullTimePayload,
            monthlyPay: "0",
            hourlyRate: "0",
            restDayRate: "0",
        });

        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ["monthlyPay"],
                    message: "Monthly pay must be a positive number",
                }),
            ]),
        );
    });

    it("rejects zero hourly rate for part-time workers", () => {
        const result = workerUpsertSchema.safeParse({
            ...fullTimePayload,
            employmentType: "Part Time",
            employmentArrangement: "Local Worker",
            countryOfOrigin: "",
            race: "",
            monthlyPay: "",
            hourlyRate: "0",
            restDayRate: "",
            minimumWorkingHours: "",
            paymentMethod: "Cash",
            payNowPhone: "",
        });

        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ["hourlyRate"],
                    message: "Hourly rate must be a positive number",
                }),
            ]),
        );
    });

    it("parses payloads that lose undefined-valued keys via JSON (Server Action serialization)", () => {
        const first = workerUpsertSchema.safeParse(fullTimePayload);
        const firstData = expectSuccessfulParse(first);

        expect(firstData.cpf).toBeUndefined();

        const wire = JSON.parse(JSON.stringify(firstData)) as Record<
            string,
            unknown
        >;
        expect("cpf" in wire).toBe(false);

        const second = workerUpsertSchema.safeParse(wire);
        expectSuccessfulParse(second);
    });

    it("parses part-time payloads after stripping several optional numeric columns", () => {
        const partTimePayload = {
            name: "Part Timer",
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
        const firstData = expectSuccessfulParse(first);

        expect(firstData.monthlyPay).toBeUndefined();
        expect(firstData.restDayRate).toBeUndefined();
        expect(firstData.minimumWorkingHours).toBeUndefined();

        const wire = JSON.parse(JSON.stringify(firstData)) as Record<
            string,
            unknown
        >;
        expect("monthlyPay" in wire).toBe(false);
        expect("restDayRate" in wire).toBe(false);
        expect("minimumWorkingHours" in wire).toBe(false);

        const second = workerUpsertSchema.safeParse(wire);
        expectSuccessfulParse(second);
    });
});
