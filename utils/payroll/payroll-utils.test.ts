import { describe, expect, it } from "vitest";
import { calculatePay, type PayCalcInput } from "./payroll-utils";

describe("calculatePay", () => {
    it("part-time worker with public holidays > 0 earns pure hourly with no public holiday pay", () => {
        const input: PayCalcInput = {
            employmentType: "Part Time",
            totalHoursWorked: 80,
            minimumWorkingHours: null,
            monthlyPay: null,
            hourlyRate: 12,
            restDayRate: 24,
            restDays: 0,
            publicHolidays: 3,
        };

        const result = calculatePay(input);

        expect(result.publicHolidayPay).toBe(0);
        expect(result.earningsTotal).toBe(960); // 12 * 80
        expect(result.basePay).toBe(960);
        expect(result.overtimeHours).toBe(0);
        expect(result.overtimePay).toBe(0);
        expect(result.restDayPay).toBe(0);
    });

    it("part-time worker with zero public holidays still earns pure hourly", () => {
        const input: PayCalcInput = {
            employmentType: "Part Time",
            totalHoursWorked: 60,
            minimumWorkingHours: null,
            monthlyPay: null,
            hourlyRate: 10,
            restDayRate: 20,
            restDays: 0,
            publicHolidays: 0,
        };

        const result = calculatePay(input);

        expect(result.publicHolidayPay).toBe(0);
        expect(result.earningsTotal).toBe(600); // 10 * 60
        expect(result.basePay).toBe(600);
        expect(result.overtimeHours).toBe(0);
        expect(result.overtimePay).toBe(0);
        expect(result.restDayPay).toBe(0);
    });

    it("full-time worker still receives public holiday pay, overtime, and rest-day pay", () => {
        const input: PayCalcInput = {
            employmentType: "Full Time",
            totalHoursWorked: 270,
            minimumWorkingHours: 260,
            monthlyPay: 2000,
            hourlyRate: 10,
            restDayRate: 20,
            restDays: 4,
            publicHolidays: 2,
        };

        const result = calculatePay(input);

        expect(result.basePay).toBe(2000);
        expect(result.overtimeHours).toBe(10);
        expect(result.overtimePay).toBe(100); // 10 * 10
        expect(result.restDayPay).toBe(80); // 20 * 4
        expect(result.publicHolidayPay).toBe(40); // 20 * 2
        expect(result.earningsTotal).toBe(2220); // 2000 + 100 + 80 + 40
    });
});
