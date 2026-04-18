/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    fetchSettlementCandidates: vi.fn(),
    fetchPayrollDownloadSelection: vi.fn(),
    settleDraftPayrolls: vi.fn(),
    streamPayrollZipFromApi: vi.fn(),
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

vi.mock("@/app/dashboard/payroll/download-payroll-zip-client", () => ({
    streamPayrollZipFromApi: (...args: unknown[]) =>
        mocks.streamPayrollZipFromApi(...args),
    computeZipEtaSec: () => undefined,
}));

vi.mock("@/components/data-table/data-table", () => ({
    DataTable: ({
        data,
        isLoading,
        enableRowSelection,
        onRowSelectionChange,
        getRowId,
    }: {
        data: Array<{ workerName: string; id: string }>;
        isLoading?: boolean;
        enableRowSelection?: boolean;
        onRowSelectionChange?: (next: Record<string, boolean>) => void;
        getRowId?: (row: { id: string }) => string;
    }) => (
        <div data-testid="mock-data-table">
            {isLoading ? (
                <div data-testid="mock-datatable-loading">Loading table</div>
            ) : (
                <>
                    {enableRowSelection && onRowSelectionChange && getRowId ? (
                        <button
                            type="button"
                            data-testid="mock-select-first-row"
                            onClick={() => {
                                const first = data[0];
                                if (first) {
                                    onRowSelectionChange({
                                        [getRowId(first)]: true,
                                    });
                                }
                            }}>
                            Select first row (test)
                        </button>
                    ) : null}
                    {data.map((row) => (
                        <div key={row.workerName}>{row.workerName}</div>
                    ))}
                </>
            )}
        </div>
    ),
}));

import { SettleDraftPayrollsPanel } from "@/app/dashboard/payroll/settle-drafts/settle-draft-payrolls-panel";
import { DownloadPayrollsPanel } from "@/app/dashboard/payroll/download-payrolls/download-payrolls-panel";

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
        mocks.settleDraftPayrolls.mockResolvedValue({
            success: true,
            settled: 1,
            settledPayrollIds: ["payroll-1"],
        });
        mocks.streamPayrollZipFromApi.mockResolvedValue({ ok: true });
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

    it("opens the ZIP progress dialog when downloading a selection", async () => {
        const user = userEvent.setup();
        let resolveZip!: (value: { ok: true }) => void;
        const zipPromise = new Promise<{ ok: true }>((resolve) => {
            resolveZip = resolve;
        });
        mocks.streamPayrollZipFromApi.mockImplementationOnce(() => zipPromise);
        mocks.fetchPayrollDownloadSelection.mockResolvedValue([payrollRow]);

        render(<DownloadPayrollsPanel />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        await user.click(screen.getByTestId("mock-select-first-row"));

        await user.click(
            screen.getByRole("button", { name: "Download selected (1)" }),
        );

        expect(
            await screen.findByRole("dialog", { name: "Preparing download" }),
        ).toBeTruthy();
        expect(
            screen.getByText("Generating PDFs and building ZIP…"),
        ).toBeTruthy();
        resolveZip({ ok: true });
        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Preparing download" }),
            ).toBeNull();
        });
    });

    it("shows settling then generating in the dialog when settling drafts", async () => {
        const user = userEvent.setup();
        let resolveSettle!: (value: unknown) => void;
        const settlePromise = new Promise((resolve) => {
            resolveSettle = resolve;
        });
        let resolveZip!: (value: { ok: true }) => void;
        const zipPromise = new Promise<{ ok: true }>((resolve) => {
            resolveZip = resolve;
        });
        mocks.settleDraftPayrolls.mockImplementationOnce(() => settlePromise);
        mocks.streamPayrollZipFromApi.mockImplementationOnce(() => zipPromise);
        mocks.fetchSettlementCandidates.mockResolvedValue([payrollRow]);

        render(<SettleDraftPayrollsPanel />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        const clickDone = user.click(
            screen.getByRole("button", { name: "Settle selected (1)" }),
        );

        expect(
            await screen.findByText("Settling payrolls…"),
        ).toBeTruthy();

        resolveSettle({
            success: true,
            settled: 1,
            settledPayrollIds: ["payroll-1"],
        });

        await waitFor(() => {
            expect(
                screen.getByText("Generating PDFs and building ZIP…"),
            ).toBeTruthy();
        });

        resolveZip({ ok: true });
        await clickDone;
        await waitFor(() => {
            expect(
                screen.queryByRole("dialog", { name: "Preparing download" }),
            ).toBeNull();
        });
    });

    it("shows determinate ZIP progress after stream progress events", async () => {
        const user = userEvent.setup();
        mocks.streamPayrollZipFromApi.mockImplementationOnce(
            (
                _ids: string[],
                onProgress: (e: {
                    type: string;
                    n?: number;
                    i?: number;
                    workerName?: string;
                }) => void,
            ) =>
                new Promise<{ ok: true }>((resolve) => {
                    setTimeout(() => {
                        onProgress({ type: "meta", n: 2 });
                        setTimeout(() => {
                            onProgress({
                                type: "progress",
                                i: 1,
                                n: 2,
                                workerName: "Alice",
                            });
                            setTimeout(() => resolve({ ok: true }), 0);
                        }, 0);
                    }, 0);
                }),
        );
        mocks.fetchPayrollDownloadSelection.mockResolvedValue([payrollRow]);

        render(<DownloadPayrollsPanel />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        await user.click(screen.getByTestId("mock-select-first-row"));

        await user.click(
            screen.getByRole("button", { name: "Download selected (1)" }),
        );

        await waitFor(() => {
            expect(
                screen.getByText("1 of 2 files finished processing"),
            ).toBeTruthy();
        });
    });
});
