export function makePayroll(overrides?: Partial<{
    id: string;
    workerId: string;
    periodStart: string;
    periodEnd: string;
    payrollDate: string;
    status: "draft" | "settled";
}>) {
    return {
        id: "payroll-1",
        workerId: "worker-1",
        periodStart: "2025-03-01",
        periodEnd: "2025-03-31",
        payrollDate: "2025-04-05",
        status: "draft" as const,
        ...overrides,
    };
}

export function makeAdvance(overrides?: Partial<{
    id: string;
    advanceRequestId: string;
    status: "loan" | "paid";
}>) {
    return {
        id: "adv-1",
        advanceRequestId: "req-1",
        status: "loan" as const,
        ...overrides,
    };
}
