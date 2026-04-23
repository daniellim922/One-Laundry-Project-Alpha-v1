"use client";

type ApiWriteSuccess<T> = {
    ok: true;
    data: T;
};

type ApiWriteFailure = {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};

async function writePayrollApi<T>(
    path: string,
    init: RequestInit,
): Promise<T | { error: string }> {
    const response = await fetch(path, init);
    const raw = await response.text();
    if (!raw.trim()) {
        return {
            error: response.ok
                ? "Empty response from server"
                : `Request failed (${response.status})`,
        };
    }
    let body: ApiWriteSuccess<T> | ApiWriteFailure;
    try {
        body = JSON.parse(raw) as ApiWriteSuccess<T> | ApiWriteFailure;
    } catch {
        return { error: "Invalid response from server" };
    }

    if (!response.ok || !body.ok) {
        return { error: body.ok ? "Request failed" : body.error.message };
    }

    return body.data;
}

export function settlePayroll(payrollId: string) {
    return writePayrollApi<{ success: true; payrollId: string }>(
        `/api/payroll/${payrollId}/settle`,
        {
            method: "POST",
        },
    );
}

export function revertPayroll(payrollId: string) {
    return writePayrollApi<{ success: true; payrollId: string }>(
        `/api/payroll/${payrollId}/revert`,
        {
            method: "POST",
        },
    );
}

export function settleDraftPayrolls(payrollIds: string[]) {
    return writePayrollApi<{
        success: true;
        settled: number;
        settledPayrollIds: string[];
    }>("/api/payroll/settle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ payrollIds }),
    });
}

export function updateVoucherDays(input: {
    payrollId: string;
    voucherId: string;
    restDays: number;
    publicHolidays: number;
}) {
    return writePayrollApi<{
        success: true;
        payrollId: string;
        voucherId: string;
    }>(`/api/payroll/${input.payrollId}/voucher-days`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            voucherId: input.voucherId,
            restDays: input.restDays,
            publicHolidays: input.publicHolidays,
        }),
    });
}

export function updateVoucherPayRate(input: {
    payrollId: string;
    voucherId: string;
    field:
        | "monthlyPay"
        | "hourlyRate"
        | "restDayRate"
        | "minimumWorkingHours";
    value: number;
}) {
    return writePayrollApi<{
        success: true;
        payrollId: string;
        voucherId: string;
    }>(`/api/payroll/${input.payrollId}/voucher-rates`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            voucherId: input.voucherId,
            field: input.field,
            value: input.value,
        }),
    });
}
