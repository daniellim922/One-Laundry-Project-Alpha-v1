/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    settlePayroll: vi.fn(),
    revertPayroll: vi.fn(),
    fetchRevertPreview: vi.fn(),
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

vi.mock("@/app/dashboard/payroll/command-api", () => ({
    settlePayroll: (...args: unknown[]) => mocks.settlePayroll(...args),
    revertPayroll: (...args: unknown[]) => mocks.revertPayroll(...args),
}));

vi.mock("@/app/dashboard/payroll/read-api", () => ({
    fetchRevertPreview: (...args: unknown[]) => mocks.fetchRevertPreview(...args),
}));

import { PayrollStepProgress } from "@/app/dashboard/payroll/[id]/payroll-step-progress";
import { formatEnGbDmyNumericFromCalendar } from "@/utils/time/intl-en-gb";
import { localTimeHm } from "@/utils/time/local-time";

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
        mocks.fetchRevertPreview.mockResolvedValue([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
        ]);
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

    it("opens confirmation dialog when Revert is clicked", async () => {
        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));

        expect(await screen.findByText("Confirm revert")).toBeTruthy();
        expect(
            screen.getByText("The following changes will be applied:"),
        ).toBeTruthy();
    });

    it("calls revertPayroll on confirm and navigates to breakdown", async () => {
        mocks.revertPayroll.mockResolvedValueOnce({ success: true });

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));
        fireEvent.click(
            await screen.findByRole("button", { name: "Yes, revert" }),
        );

        await waitFor(() => {
            expect(mocks.revertPayroll).toHaveBeenCalledWith("payroll-1");
        });

        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith(
                "/dashboard/payroll/payroll-1/breakdown",
            );
        });
    });

    it("shows error in dialog when revert fails", async () => {
        mocks.revertPayroll.mockResolvedValueOnce({
            error: "Only Settled payrolls can be reverted",
        });

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));
        fireEvent.click(
            await screen.findByRole("button", { name: "Yes, revert" }),
        );

        expect(
            await screen.findByText("Only Settled payrolls can be reverted"),
        ).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it("prevents duplicate revert submissions on rapid confirm clicks", async () => {
        const revertDeferred = createDeferred<{ success: true }>();
        mocks.revertPayroll.mockImplementationOnce(() => revertDeferred.promise);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));
        const confirmButton = await screen.findByRole("button", {
            name: "Yes, revert",
        });
        fireEvent.click(confirmButton);
        fireEvent.click(confirmButton);

        expect(mocks.revertPayroll).toHaveBeenCalledTimes(1);

        revertDeferred.resolve({ success: true });

        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith(
                "/dashboard/payroll/payroll-1/breakdown",
            );
        });
        expect(mocks.push).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when revert dialog opens", async () => {
        const previewDeferred = createDeferred<{
            name: string;
            currentStatus: string;
            futureStatus: string;
        }[]>();
        mocks.fetchRevertPreview.mockImplementationOnce(() => previewDeferred.promise);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));

        expect(await screen.findByText("Loading preview...")).toBeTruthy();

        previewDeferred.resolve([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
        ]);
    });

    it("renders preview table with Name / Current Status / Future Status columns after data loads", async () => {
        mocks.fetchRevertPreview.mockResolvedValueOnce([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
            {
                name: "Timesheets (3)",
                currentStatus: "Timesheet Paid",
                futureStatus: "Timesheet Unpaid",
            },
        ]);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));

        expect(await screen.findByRole("table")).toBeTruthy();
        expect(screen.getByText("Name")).toBeTruthy();
        expect(screen.getByText("Current Status")).toBeTruthy();
        expect(screen.getByText("Future Status")).toBeTruthy();
        expect(screen.getByText("Payroll")).toBeTruthy();
        expect(screen.getByText("Settled")).toBeTruthy();
        expect(screen.getByText("Draft")).toBeTruthy();
        expect(screen.getByText("Timesheets (3)")).toBeTruthy();
        expect(screen.getByText("Timesheet Paid")).toBeTruthy();
        expect(screen.getByText("Timesheet Unpaid")).toBeTruthy();
    });

    it("expands Timesheets row to show timesheet detail sub-table from preview", async () => {
        mocks.fetchRevertPreview.mockResolvedValueOnce([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
            {
                name: "Timesheets (1)",
                currentStatus: "Timesheet Paid",
                futureStatus: "Timesheet Unpaid",
                timesheetLines: [
                    {
                        id: "ts-1",
                        dateIn: "2025-03-01",
                        dateOut: "2025-03-02",
                        timeIn: "09:15:00",
                        timeOut: "17:30:00",
                        hours: 8.25,
                    },
                ],
            },
        ]);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));
        expect(await screen.findByRole("table")).toBeTruthy();

        expect(screen.queryByRole("columnheader", { name: "Date in" })).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: /Timesheets \(1\)/ }),
        );

        expect(
            await screen.findByRole("columnheader", { name: "Date in" }),
        ).toBeTruthy();
        expect(
            screen.getAllByRole("columnheader", { name: "Current Status" }),
        ).toHaveLength(2);
        expect(
            screen.getAllByRole("columnheader", { name: "Future Status" }),
        ).toHaveLength(2);
        expect(screen.getByText(formatEnGbDmyNumericFromCalendar("2025-03-01"))).toBeTruthy();
        expect(screen.getByText(formatEnGbDmyNumericFromCalendar("2025-03-02"))).toBeTruthy();
        expect(screen.getByText(localTimeHm("09:15:00"))).toBeTruthy();
        expect(screen.getByText(localTimeHm("17:30:00"))).toBeTruthy();
        expect(screen.getByText("8.25")).toBeTruthy();
        expect(
            screen.getByRole("link", { name: "View" }).getAttribute("href"),
        ).toBe("/dashboard/timesheet/ts-1/view");
    });

    it("expands Advance row to show repayment date and amount columns from preview", async () => {
        mocks.fetchRevertPreview.mockResolvedValueOnce([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
            {
                name: "Advance (1)",
                currentStatus: "Installment Paid",
                futureStatus: "Installment Loan",
                advanceInstallmentLines: [
                    {
                        id: "adv-1",
                        advanceRequestId: "req-1",
                        amount: 40,
                        repaymentDate: "2025-03-10",
                    },
                ],
            },
        ]);

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));
        expect(await screen.findByRole("table")).toBeTruthy();

        expect(
            screen.queryByRole("columnheader", { name: "Repayment date" }),
        ).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: /Advance \(1\)/ }));

        expect(
            await screen.findByRole("columnheader", { name: "Repayment date" }),
        ).toBeTruthy();
        expect(
            screen.getAllByRole("columnheader", { name: "Current Status" }),
        ).toHaveLength(2);
        expect(
            screen.getAllByRole("columnheader", { name: "Future Status" }),
        ).toHaveLength(2);
        expect(
            screen.getByRole("columnheader", { name: "Amount" }),
        ).toBeTruthy();
        expect(screen.getByText(formatEnGbDmyNumericFromCalendar("2025-03-10"))).toBeTruthy();
        expect(screen.getByText("$40")).toBeTruthy();
        expect(
            screen.getByRole("link", { name: "View" }).getAttribute("href"),
        ).toBe("/dashboard/advance/req-1");
    });

    it("shows error message if preview fetch fails", async () => {
        mocks.fetchRevertPreview.mockRejectedValueOnce(
            new Error("Payroll not found"),
        );

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));

        expect(await screen.findByText("Payroll not found")).toBeTruthy();
    });

    it("revert confirm button still works after preview loads", async () => {
        mocks.fetchRevertPreview.mockResolvedValueOnce([
            {
                name: "Payroll",
                currentStatus: "Settled",
                futureStatus: "Draft",
            },
        ]);
        mocks.revertPayroll.mockResolvedValueOnce({ success: true });

        render(
            <PayrollStepProgress
                payrollId="payroll-1"
                payrollStatus="Settled"
                activeStep={3}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Revert" }));

        expect(await screen.findByRole("table")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Yes, revert" }));

        await waitFor(() => {
            expect(mocks.revertPayroll).toHaveBeenCalledWith("payroll-1");
        });
        await waitFor(() => {
            expect(mocks.push).toHaveBeenCalledWith(
                "/dashboard/payroll/payroll-1/breakdown",
            );
        });
    });
});
