"use client";

import type { RevertPreviewRow } from "@/services/payroll/get-revert-preview";
import type { PayrollSelectionRow } from "@/services/payroll/list-draft-payrolls-for-settlement";

type ApiReadSuccess<T> = {
    ok: true;
    data: T;
};

type ApiReadFailure = {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};

async function readPayrollApi<T>(path: string): Promise<T> {
    const response = await fetch(path, {
        method: "GET",
        cache: "no-store",
    });

    const body = (await response.json()) as ApiReadSuccess<T> | ApiReadFailure;

    if (!response.ok || !body.ok) {
        throw new Error(body.ok ? "Request failed" : body.error.message);
    }

    return body.data;
}

export function fetchRevertPreview(payrollId: string) {
    return readPayrollApi<RevertPreviewRow[]>(
        `/api/payroll/${payrollId}/revert-preview`,
    );
}

export function fetchSettlementCandidates() {
    return readPayrollApi<PayrollSelectionRow[]>(
        "/api/payroll/settlement-candidates",
    );
}

export function fetchPayrollDownloadSelection() {
    return readPayrollApi<PayrollSelectionRow[]>(
        "/api/payroll/download-selection",
    );
}
