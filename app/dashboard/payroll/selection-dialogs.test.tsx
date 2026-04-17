/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    fetchSettlementCandidates: vi.fn(),
    fetchPayrollDownloadSelection: vi.fn(),
    settleDraftPayrolls: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
        refresh: mocks.refresh,
    }),
}));

vi.mock("@/app/dashboard/payroll/read-api", () => ({
    fetchSettlementCandidates: (...args: unknown[]) =>
        mocks.fetchSettlementCandidates(...args),
    fetchPayrollDownloadSelection: (...args: unknown[]) =>
        mocks.fetchPayrollDownloadSelection(...args),
}));

vi.mock("@/app/dashboard/payroll/command-api", () => ({
    settleDraftPayrolls: (...args: unknown[]) =>
        mocks.settleDraftPayrolls(...args),
}));

vi.mock("@/components/data-table/data-table", () => ({
    DataTable: ({
        data,
        isLoading,
    }: {
        data: Array<{ workerName: string }>;
        isLoading?: boolean;
    }) => (
        <div data-testid="mock-data-table">
            {isLoading ? (
                <div data-testid="mock-datatable-loading">Loading table</div>
            ) : (
                data.map((row) => (
                    <div key={row.workerName}>{row.workerName}</div>
                ))
            )}
        </div>
    ),
}));

import { SettleDraftPayrollsPanel } from "@/app/dashboard/payroll/settle-draft-payrolls-panel";
import { DownloadPayrollsPanel } from "@/app/dashboard/payroll/download-payrolls-panel";

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const payrollRow = {
    id: "payroll-1",
    workerId: "worker-1",
    payrollVoucherId: "voucher-1",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    payrollDate: "2026-02-05",
    status: "Draft" as const,
    createdAt: new Date("2026-01-31T00:00:00.000Z"),
    updatedAt: new Date("2026-01-31T00:00:00.000Z"),
    workerName: "Alice",
    employmentType: "Full Time" as const,
    employmentArrangement: "Local Worker" as const,
};

describe("Payroll selection panels", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.settleDraftPayrolls.mockResolvedValue({ success: true });
    });

    it("lazy-loads settlement candidates and preserves the loading state", async () => {
        const deferred = createDeferred<(typeof payrollRow)[]>();
        mocks.fetchSettlementCandidates.mockImplementationOnce(
            () => deferred.promise,
        );

        render(<SettleDraftPayrollsPanel />);

        expect(
            await screen.findByTestId("mock-datatable-loading"),
        ).toBeTruthy();

        deferred.resolve([payrollRow]);

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(
            screen.getByRole("button", { name: "Settle selected (1)" }),
        ).toBeTruthy();
    });

    it("lazy-loads download selection rows and preserves the loading state", async () => {
        const deferred = createDeferred<(typeof payrollRow)[]>();
        mocks.fetchPayrollDownloadSelection.mockImplementationOnce(
            () => deferred.promise,
        );

        render(<DownloadPayrollsPanel />);

        expect(
            await screen.findByTestId("mock-datatable-loading"),
        ).toBeTruthy();

        deferred.resolve([payrollRow]);

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(
            screen.getByRole("button", { name: "Download selected (0)" }),
        ).toBeTruthy();
    });
});
