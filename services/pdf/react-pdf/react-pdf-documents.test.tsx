import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";

import {
    AdvanceVoucherDocument,
    PayrollPdfDocument,
    type AdvanceVoucherData,
    type PayrollPdfData,
} from "@/services/pdf/react-pdf";

function samplePayrollPdfData(
    overrides: Partial<PayrollPdfData> = {},
): PayrollPdfData {
    const base: PayrollPdfData = {
        voucher: {
            voucher: {
                voucherNumber: "2026-0001",
                employmentType: "Full Time",
                monthlyPay: 2200,
                hourlyRate: 9,
                minimumWorkingHours: 260,
                totalHoursWorked: 240,
                hoursNotMet: null,
                hoursNotMetDeduction: null,
                overtimeHours: null,
                overtimePay: null,
                restDays: null,
                restDayRate: null,
                restDayPay: null,
                publicHolidays: null,
                publicHolidayPay: null,
                cpf: 320,
                advance: null,
                subTotal: 1880,
                grandTotal: 1880,
                paymentMethod: "Cash",
                payNowPhone: null,
                bankAccountNumber: null,
            },
            periodLabel: "01/01/2026 – 31/01/2026",
            voucherDate: "05/02/2026",
            workerName: "Test Worker Alpha",
        },
        timesheet: {
            entries: [
                {
                    dateIn: "2026-01-02",
                    timeIn: "08:00",
                    dateOut: "2026-01-02",
                    timeOut: "18:00",
                    hours: "10",
                },
            ],
            periodStart: "2026-01-01",
            periodEnd: "2026-01-31",
            workerName: "Test Worker Alpha",
        },
    };
    return { ...base, ...overrides };
}

function sampleAdvanceData(
    overrides: Partial<AdvanceVoucherData> = {},
): AdvanceVoucherData {
    const base: AdvanceVoucherData = {
        request: {
            workerName: "Jamie Tan",
            amountRequested: 700,
            status: "Advance Loan",
            requestDate: "2026-04-20",
        },
        advances: [
            {
                id: "adv-line-1",
                amount: 233.33,
                status: "Installment Loan",
                repaymentDate: "2026-05-31",
            },
        ],
        employeeSignature: null,
        employeeSignatureDate: null,
        managerSignature: null,
        managerSignatureDate: null,
    };
    return { ...base, ...overrides };
}

async function assertValidPdfBuffer(instance: ReturnType<typeof pdf>) {
    const blob = await instance.toBlob();
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
}

describe("React PDF documents", () => {
    it("renders combined payroll PDF without throwing and emits a PDF blob", async () => {
        await assertValidPdfBuffer(
            pdf(<PayrollPdfDocument data={samplePayrollPdfData()} />),
        );
    });

    it("renders payroll PDF with zero timesheet rows", async () => {
        await assertValidPdfBuffer(
            pdf(
                <PayrollPdfDocument
                    data={samplePayrollPdfData({
                        timesheet: {
                            entries: [],
                            periodStart: "2026-02-01",
                            periodEnd: "2026-02-28",
                            workerName: "Empty Sheet Worker",
                        },
                    })}
                />,
            ),
        );
    });

    it("renders advance voucher with repayment rows", async () => {
        await assertValidPdfBuffer(
            pdf(<AdvanceVoucherDocument data={sampleAdvanceData()} />),
        );
    });

    it("renders advance voucher with no repayment rows", async () => {
        await assertValidPdfBuffer(
            pdf(
                <AdvanceVoucherDocument
                    data={sampleAdvanceData({ advances: [] })}
                />,
            ),
        );
    });
});
