import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiError } from "@/app/api/_shared/responses";
import { mockAuthenticatedApiOperator } from "@/test/_support/api-auth-mock";

const mocks = vi.hoisted(() => ({
    requireCurrentApiUser: vi.fn(),
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    db: {
        select: vi.fn(),
    },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
    const actual = await importOriginal<typeof import("drizzle-orm")>();
    return {
        ...actual,
        eq: (...args: unknown[]) => mocks.eq(...args),
        and: (...args: unknown[]) => mocks.and(...args),
        gte: (...args: unknown[]) => mocks.gte(...args),
        lte: (...args: unknown[]) => mocks.lte(...args),
    };
});

vi.mock("@/lib/db", () => ({
    db: mocks.db,
}));

vi.mock("@/app/api/_shared/auth", () => ({
    requireCurrentApiUser: (...args: unknown[]) =>
        mocks.requireCurrentApiUser(...args),
}));

import { GET } from "@/app/api/payroll/[id]/pdf-data/route";

function mockPayrollSelectRows(mainRow: unknown | null, timesheetRows: unknown[]) {
    mocks.db.select.mockReset();
    mocks.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue(
                            mainRow ? [mainRow] : [],
                        ),
                    }),
                }),
            }),
        }),
    });
    if (mainRow) {
        mocks.db.select.mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    orderBy: vi.fn().mockResolvedValue(timesheetRows),
                }),
            }),
        });
    }
}

describe("GET /api/payroll/[id]/pdf-data", () => {
    const voucherRow = {
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
    };

    const workerRow = { name: "Alice Ng" };

    const payrollRow = {
        workerId: "worker-1",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        payrollDate: "2026-02-05",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.db.select.mockReset();
        mockAuthenticatedApiOperator(mocks);
    });

    it("returns PayrollPdfData with scoped timesheet rows", async () => {
        mockPayrollSelectRows(
            { payroll: payrollRow, worker: workerRow, voucher: voucherRow },
            [
                {
                    dateIn: "2026-01-02",
                    timeIn: "08:00:00",
                    dateOut: "2026-01-02",
                    timeOut: "18:00:00",
                    hours: "10",
                },
            ],
        );

        const res = await GET(
            new Request("http://localhost/api/payroll/pay-1/pdf-data"),
            { params: Promise.resolve({ id: "pay-1" }) },
        );

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.data.voucher.workerName).toBe("Alice Ng");
        expect(body.data.timesheet.entries).toHaveLength(1);
        expect(body.data.timesheet.entries[0].dateIn).toBe("2026-01-02");
    });

    it("returns 404 when payroll is missing", async () => {
        mockPayrollSelectRows(null, []);

        const res = await GET(
            new Request("http://localhost/api/payroll/nope/pdf-data"),
            { params: Promise.resolve({ id: "nope" }) },
        );

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 401 when unauthenticated", async () => {
        mocks.requireCurrentApiUser.mockResolvedValueOnce(
            apiError({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Authentication required",
            }),
        );

        mockPayrollSelectRows(
            { payroll: payrollRow, worker: workerRow, voucher: voucherRow },
            [],
        );

        const res = await GET(
            new Request("http://localhost/api/payroll/pay-1/pdf-data"),
            { params: Promise.resolve({ id: "pay-1" }) },
        );

        expect(res.status).toBe(401);
        expect(mocks.db.select).not.toHaveBeenCalled();
    });
});
