/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    searchParamsString: "",
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: mocks.replace,
    }),
    useSearchParams: () => new URLSearchParams(mocks.searchParamsString),
}));

import { SummaryCapture } from "@/components/ui/summary-capture";

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("SummaryCapture", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.searchParamsString = "";
        window.history.replaceState(
            null,
            "",
            "/dashboard/payroll/pay-1/summary",
        );
    });

    it("auto-downloads once for a single download=1 intent and consumes it", async () => {
        mocks.searchParamsString = "download=1&mode=voucher";
        window.history.replaceState(
            null,
            "",
            "/dashboard/payroll/pay-1/summary?download=1&mode=voucher",
        );

        const onDownload = vi.fn().mockResolvedValue(undefined);

        render(
            <React.StrictMode>
                <SummaryCapture onDownload={onDownload}>
                    <div>content</div>
                </SummaryCapture>
            </React.StrictMode>,
        );

        await waitFor(() => {
            expect(onDownload).toHaveBeenCalledTimes(1);
        });
        expect(mocks.replace).toHaveBeenCalledWith(
            "/dashboard/payroll/pay-1/summary?mode=voucher",
            { scroll: false },
        );
    });

    it("shows inline auto-download failure and keeps manual recovery available", async () => {
        mocks.searchParamsString = "download=1";
        window.history.replaceState(
            null,
            "",
            "/dashboard/payroll/pay-1/summary?download=1",
        );

        const onDownload = vi
            .fn()
            .mockRejectedValueOnce(new Error("PDF download failed (500)"))
            .mockResolvedValueOnce(undefined);

        render(
            <SummaryCapture onDownload={onDownload}>
                <div>content</div>
            </SummaryCapture>,
        );

        await waitFor(() => {
            expect(onDownload).toHaveBeenCalledTimes(1);
        });

        expect(
            await screen.findByText(
                "Automatic download failed. Use Download PDF to retry.",
            ),
        ).toBeTruthy();
        expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

        await waitFor(() => {
            expect(onDownload).toHaveBeenCalledTimes(2);
        });
    });

    it("suppresses duplicate in-flight manual clicks and allows repeated manual downloads", async () => {
        const firstDownload = createDeferred<void>();
        const onDownload = vi
            .fn()
            .mockImplementationOnce(() => firstDownload.promise)
            .mockResolvedValueOnce(undefined);

        render(
            <SummaryCapture onDownload={onDownload}>
                <div>content</div>
            </SummaryCapture>,
        );

        const downloadButton = screen.getByRole("button", {
            name: "Download PDF",
        });

        fireEvent.click(downloadButton);
        fireEvent.click(downloadButton);

        expect(onDownload).toHaveBeenCalledTimes(1);

        firstDownload.resolve();
        await waitFor(() => {
            expect(downloadButton.hasAttribute("disabled")).toBe(false);
        });

        fireEvent.click(downloadButton);

        await waitFor(() => {
            expect(onDownload).toHaveBeenCalledTimes(2);
        });
    });
});

