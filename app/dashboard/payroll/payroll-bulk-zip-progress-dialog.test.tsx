/** @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PayrollBulkZipProgressDialog } from "@/app/dashboard/payroll/payroll-bulk-zip-progress-dialog";

describe("PayrollBulkZipProgressDialog", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows phase copy, indeterminate progress, and elapsed while in flight", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error={null}
                onDismiss={vi.fn()}
            />,
        );

        expect(
            screen.getByRole("progressbar", { name: /in progress/i }),
        ).toBeTruthy();
        expect(
            screen.getByText("Generating PDFs and building ZIP…"),
        ).toBeTruthy();
        expect(screen.getByText(/Elapsed:/)).toBeTruthy();
    });

    it("shows settling phase copy when phase is settling", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="settling"
                error={null}
                onDismiss={vi.fn()}
            />,
        );

        expect(screen.getByText("Settling payrolls…")).toBeTruthy();
    });

    it("calls onDismiss when the user activates Dismiss after an error", async () => {
        const user = userEvent.setup();
        const onDismiss = vi.fn();

        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error="ZIP download failed (500)"
                onDismiss={onDismiss}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("shows determinate copy, percent, and aria-valuenow when progress is set", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error={null}
                onDismiss={vi.fn()}
                progress={{ i: 5, n: 10, currentName: "Sam" }}
                etaSec={120}
            />,
        );

        expect(
            screen.getByText("5 of 10 files finished processing"),
        ).toBeTruthy();
        expect(screen.getByText("50%")).toBeTruthy();
        const bar = screen.getByRole("progressbar");
        expect(bar.getAttribute("aria-valuenow")).toBe("50");
        expect(screen.getByText("Current: Sam")).toBeTruthy();
    });

    it("shows Estimating when etaSec is undefined", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error={null}
                onDismiss={vi.fn()}
                progress={{ i: 1, n: 10 }}
            />,
        );

        expect(screen.getByText("Estimating…")).toBeTruthy();
    });

    it("formats eta when etaSec is provided", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error={null}
                onDismiss={vi.fn()}
                progress={{ i: 3, n: 10 }}
                etaSec={75}
            />,
        );

        expect(screen.getByText("About 1:15 remaining")).toBeTruthy();
    });

    it("shows Finalizing ZIP and hides ETA when i equals n", () => {
        render(
            <PayrollBulkZipProgressDialog
                open
                phase="generating"
                error={null}
                onDismiss={vi.fn()}
                progress={{ i: 10, n: 10 }}
                etaSec={5}
            />,
        );

        expect(screen.getByText("Finalizing ZIP…")).toBeTruthy();
        expect(screen.queryByText(/About .* remaining/)).toBeNull();
    });
});
