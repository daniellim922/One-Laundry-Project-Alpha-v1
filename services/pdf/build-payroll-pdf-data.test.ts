import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    dbSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        select: (...args: unknown[]) => mocks.dbSelect(...args),
    },
}));

vi.mock("@/services/pdf/approver-signature", () => ({
    getBundledApproverSignatureDataUrl: () => "data:image/png;base64,sig",
}));

import { buildPayrollPdfData } from "@/services/pdf/build-payroll-pdf-data";

function chainSelect(rows: unknown[]) {
    return {
        from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue(rows),
                    }),
                }),
            }),
            where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(rows),
            }),
        }),
    };
}

describe("buildPayrollPdfData", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns null when payroll does not exist", async () => {
        mocks.dbSelect.mockReturnValueOnce(
            chainSelect([]),
        );

        const result = await buildPayrollPdfData("missing");
        expect(result).toBeNull();
    });

    it("reflects updated timesheet hours in assembled PDF data", async () => {
        mocks.dbSelect
            .mockReturnValueOnce(
                chainSelect([
                    {
                        payroll: {
                            id: "payroll-1",
                            workerId: "worker-1",
                            periodStart: "2026-03-01",
                            periodEnd: "2026-03-31",
                            payrollDate: "2026-03-31",
                        },
                        worker: { name: "Alice" },
                        voucher: {
                            voucherNumber: "2026-0001",
                            employmentType: "Full Time",
                            monthlyPay: 2200,
                            hourlyRate: 9,
                            minimumWorkingHours: 260,
                            totalHoursWorked: 200,
                            hoursNotMet: null,
                            hoursNotMetDeduction: null,
                            overtimeHours: null,
                            overtimePay: null,
                            restDays: 0,
                            restDayRate: 12,
                            restDayPay: 0,
                            publicHolidays: 0,
                            publicHolidayPay: 0,
                            cpf: 0,
                            advance: 0,
                            subTotal: 2200,
                            grandTotal: 2200,
                            paymentMethod: "Cash",
                            payNowPhone: null,
                            bankAccountNumber: null,
                        },
                    },
                ]),
            )
            .mockReturnValueOnce(
                chainSelect([
                    {
                        dateIn: "2026-03-02",
                        timeIn: "08:00:00",
                        dateOut: "2026-03-02",
                        timeOut: "18:00:00",
                        hours: "10.00",
                    },
                ]),
            );

        const result = await buildPayrollPdfData("payroll-1");

        expect(result).not.toBeNull();
        expect(result?.timesheet.entries).toHaveLength(1);
        expect(result?.timesheet.entries[0]?.hours).toBe("10.00");
        expect(result?.voucher.workerName).toBe("Alice");
    });

    it("includes a timesheet with dateIn inside the period and dateOut after period end", async () => {
        mocks.dbSelect
            .mockReturnValueOnce(
                chainSelect([
                    {
                        payroll: {
                            id: "payroll-1",
                            workerId: "worker-1",
                            periodStart: "2026-05-01",
                            periodEnd: "2026-05-31",
                            payrollDate: "2026-06-05",
                        },
                        worker: { name: "Alice" },
                        voucher: {
                            voucherNumber: "2026-0001",
                            employmentType: "Full Time",
                            monthlyPay: 2200,
                            hourlyRate: 9,
                            minimumWorkingHours: 260,
                            totalHoursWorked: 11.25,
                            hoursNotMet: null,
                            hoursNotMetDeduction: null,
                            overtimeHours: null,
                            overtimePay: null,
                            restDays: 0,
                            restDayRate: 12,
                            restDayPay: 0,
                            publicHolidays: 0,
                            publicHolidayPay: 0,
                            cpf: 0,
                            advance: 0,
                            subTotal: 2200,
                            grandTotal: 2200,
                            paymentMethod: "Cash",
                            payNowPhone: null,
                            bankAccountNumber: null,
                        },
                    },
                ]),
            )
            .mockReturnValueOnce(
                chainSelect([
                    {
                        dateIn: "2026-05-31",
                        timeIn: "18:00:00",
                        dateOut: "2026-06-01",
                        timeOut: "05:15:00",
                        hours: "11.25",
                    },
                ]),
            );

        const result = await buildPayrollPdfData("payroll-1");

        expect(result?.timesheet.entries).toEqual([
            {
                dateIn: "2026-05-31",
                timeIn: "18:00:00",
                dateOut: "2026-06-01",
                timeOut: "05:15:00",
                hours: "11.25",
            },
        ]);
    });
});
