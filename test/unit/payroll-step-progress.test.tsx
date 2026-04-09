/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    settlePayroll: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
    }),
}));

vi.mock("@/components/ui/step-progress-panel", () => ({
    StepProgressPanel: ({
        finalAction,
    }: {
        finalAction?: { content: React.ReactNode };
    }) => <div>{finalAction?.content ?? null}</div>,
}));

vi.mock("@/app/dashboard/payroll/actions", () => ({
    settlePayroll: (...args: unknown[]) => mocks.settlePayroll(...args),
}));

import { PayrollStepProgress } from "@/app/dashboard/payroll/[id]/payroll-step-progress";

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe("PayrollStepProgress", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("prevents duplicate settle submissions on rapid confirm clicks", async () => {
        const settleDeferred = createDeferred<{ success: true }>();
        mocks.settlePayroll.mockImplementationOnce(() => settleDeferred.promise);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Draft"
                activeStep={2}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Settle" }));
        const confirmButton = screen.getByRole("button", {
            name: "Yes, settle",
        });
        fireEvent.click(confirmButton);
        fireEvent.click(confirmButton);

        expect(mocks.settlePayroll).toHaveBeenCalledTimes(1);
        expect(mocks.settlePayroll).toHaveBeenCalledWith("payroll-1");

        settleDeferred.resolve({ success: true });

        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith(
                "/dashboard/payroll/payroll-1/summary?download=1",
            );
        });
        expect(mocks.push).toHaveBeenCalledTimes(1);
    });

    it("keeps existing error behavior when settle fails", async () => {
        mocks.settlePayroll.mockResolvedValueOnce({
            error: "Only Draft payrolls can be settled",
        });

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Draft"
                activeStep={2}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Settle" }));
        fireEvent.click(screen.getByRole("button", { name: "Yes, settle" }));

        expect(
            await screen.findByText("Only Draft payrolls can be settled"),
        ).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it("renders a Revert button when payroll is Settled", () => {
        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        const revert = screen.getByRole("button", { name: "Revert" });
        expect(revert).toBeTruthy();
        expect((revert as HTMLButtonElement).disabled).toBe(false);
    });
});
