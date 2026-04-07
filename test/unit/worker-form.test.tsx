/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    createWorker: vi.fn(),
    updateWorker: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
        refresh: mocks.refresh,
    }),
}));

vi.mock("@/app/dashboard/worker/actions", () => ({
    createWorker: (...args: unknown[]) => mocks.createWorker(...args),
    updateWorker: (...args: unknown[]) => mocks.updateWorker(...args),
}));

import { WorkerForm, type WorkerWithEmployment } from "@/app/dashboard/worker/worker-form";

function makeWorker(
    overrides: Partial<WorkerWithEmployment> = {},
): WorkerWithEmployment {
    return {
        id: "worker-1",
        name: "Existing Worker",
        nric: "S1234567A",
        email: "existing@example.com",
        phone: "81112222",
        status: "Active",
        countryOfOrigin: "Singapore",
        race: "Chinese",
        employmentType: "Full Time",
        employmentArrangement: "Local Worker",
        cpf: 300,
        monthlyPay: 2100,
        hourlyRate: 10,
        restDayRate: 88,
        minimumWorkingHours: 240,
        paymentMethod: "Cash",
        payNowPhone: null,
        bankAccountNumber: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-02-01"),
        ...overrides,
    };
}

describe("WorkerForm", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createWorker.mockResolvedValue({ success: true, id: "worker-1" });
        mocks.updateWorker.mockResolvedValue({ success: true, id: "worker-1" });
    });

    it("shows create-mode required validation errors for full-time fields", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Add New Worker" }));

        expect(
            await screen.findByText("Name is required"),
        ).toBeTruthy();
        expect(
            screen.getByText("Monthly pay is required for full time workers"),
        ).toBeTruthy();
        expect(
            screen.getByText("Rest day rate is required for full time workers"),
        ).toBeTruthy();
        expect(
            screen.getByText(
                "Minimum working hours are required for full time workers",
            ),
        ).toBeTruthy();
    });

    it("requires positive hourly rate for part-time workers", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText("Name"), "Part Time Candidate");
        await user.clear(screen.getByLabelText("Hourly Rate"));
        await user.type(screen.getByLabelText("Hourly Rate"), "0");

        await user.click(screen.getByRole("button", { name: "Add New Worker" }));

        expect(
            await screen.findByText("Hourly rate must be a positive number"),
        ).toBeTruthy();
    });

    it("requires bank account number when payment method is bank transfer", async () => {
        const user = userEvent.setup();
        render(
            <WorkerForm
                worker={makeWorker({
                    paymentMethod: "Bank Transfer",
                    bankAccountNumber: "",
                })}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(
            await screen.findByText(
                "Bank account number is required for bank transfer",
            ),
        ).toBeTruthy();
    });

    it("requires paynow phone when payment method is PayNow", async () => {
        const user = userEvent.setup();
        render(
            <WorkerForm
                worker={makeWorker({
                    paymentMethod: "PayNow",
                    payNowPhone: "",
                })}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(
            await screen.findByText("PayNow phone is required when PayNow is selected"),
        ).toBeTruthy();
    });

    it("honors disabled mode (read-only): no submit button and disabled fields", () => {
        render(<WorkerForm worker={makeWorker()} disabled />);

        expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Add New Worker" })).toBeNull();
        expect((screen.getByLabelText("Name") as HTMLInputElement).disabled).toBe(
            true,
        );
        expect((screen.getByLabelText("Email") as HTMLInputElement).disabled).toBe(
            true,
        );
        expect((screen.getByLabelText("Phone") as HTMLInputElement).disabled).toBe(
            true,
        );
    });

    it("submits create flow through createWorker and navigates to worker list", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText("Name"), "Created Worker");
        await user.clear(screen.getByLabelText("Hourly Rate"));
        await user.type(screen.getByLabelText("Hourly Rate"), "12");

        await user.click(screen.getByRole("button", { name: "Add New Worker" }));

        await waitFor(() => {
            expect(mocks.createWorker).toHaveBeenCalledTimes(1);
        });

        const [fd] = mocks.createWorker.mock.calls[0] as [FormData];
        expect(fd.get("name")).toBe("Created Worker");
        expect(fd.get("employmentType")).toBe("Part Time");
        expect(fd.get("hourlyRate")).toBe("12");

        expect(mocks.push).toHaveBeenCalledWith("/dashboard/worker/all");
        expect(mocks.refresh).toHaveBeenCalled();
    });

    it("shows action errors when createWorker fails", async () => {
        mocks.createWorker.mockResolvedValueOnce({
            success: false,
            error: "NRIC already exists",
        });

        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText("Name"), "Created Worker");
        await user.clear(screen.getByLabelText("Hourly Rate"));
        await user.type(screen.getByLabelText("Hourly Rate"), "12");

        await user.click(screen.getByRole("button", { name: "Add New Worker" }));

        expect(await screen.findByText("NRIC already exists")).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it("submits edit flow through updateWorker with worker id", async () => {
        const user = userEvent.setup();
        render(<WorkerForm worker={makeWorker()} />);

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => {
            expect(mocks.updateWorker).toHaveBeenCalledTimes(1);
        });

        const [workerId, fd] = mocks.updateWorker.mock.calls[0] as [
            string,
            FormData,
        ];
        expect(workerId).toBe("worker-1");
        expect(fd.get("name")).toBe("Existing Worker");
        expect(fd.get("status")).toBe("Active");

        expect(mocks.push).toHaveBeenCalledWith("/dashboard/worker/all");
        expect(mocks.refresh).toHaveBeenCalled();
    });
});
