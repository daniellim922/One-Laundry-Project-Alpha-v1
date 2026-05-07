/** @vitest-environment jsdom */

import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
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

import { WorkerForm } from "@/app/dashboard/worker/worker-form";
import type { WorkerUpsertValues } from "@/db/schemas/worker-employment";
import { makeWorkerWithEmployment } from "@/test/factories/worker";

describe("WorkerForm", () => {
    afterEach(() => {
        cleanup();
    });

    beforeAll(() => {
        Object.assign(Element.prototype, {
            hasPointerCapture: () => false,
            setPointerCapture: () => {},
            releasePointerCapture: () => {},
            scrollIntoView: () => {},
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.createWorker.mockResolvedValue({ success: true, id: "worker-1" });
        mocks.updateWorker.mockResolvedValue({ success: true, id: "worker-1" });
    });

    it("disables Add New Worker until the create form is valid", () => {
        render(<WorkerForm />);

        expect(
            (
                screen.getByRole("button", {
                    name: "Add New Worker",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });

    it("shows NRIC, Email, Phone, Country of Origin, and Race fields in create mode", () => {
        render(<WorkerForm />);

        expect(screen.getByLabelText(/^NRIC/)).toBeTruthy();
        expect(screen.getByLabelText(/^Email/)).toBeTruthy();
        expect(screen.getByLabelText(/^Phone/)).toBeTruthy();
        expect(screen.getByLabelText(/^Country of Origin/)).toBeTruthy();
        expect(screen.getByLabelText(/^Race/)).toBeTruthy();
    });

    it("defaults payment method to Cash in create mode", () => {
        render(<WorkerForm />);

        const paymentTrigger = screen.getByLabelText(/Payment Method/i);
        expect(paymentTrigger.textContent).toContain("Cash");
    });

    it("lists Cash, Bank Transfer, and PayNow as payment method options", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByLabelText(/Payment Method/i));
        const listbox = await screen.findByRole("listbox");

        expect(within(listbox).getByText("Cash")).toBeTruthy();
        expect(within(listbox).getByText("Bank Transfer")).toBeTruthy();
        expect(within(listbox).getByText("PayNow")).toBeTruthy();
    });

    it("defaults employment type to Full Time and arrangement to Local Worker", () => {
        render(<WorkerForm />);

        expect(
            screen
                .getByRole("button", { name: "Full Time" })
                .getAttribute("aria-pressed"),
        ).toBe("true");
        expect(
            screen
                .getByRole("button", { name: "Local Worker" })
                .getAttribute("aria-pressed"),
        ).toBe("true");
    });

    it("defaults shift pattern to Day Shift in create mode", () => {
        render(<WorkerForm />);

        expect(screen.getByRole("group", { name: "Shift pattern" })).toBeTruthy();
        expect(
            screen
                .getByRole("button", { name: "Day Shift" })
                .getAttribute("aria-pressed"),
        ).toBe("true");
        expect(
            screen
                .getByRole("button", { name: "Night Shift" })
                .getAttribute("aria-pressed"),
        ).toBe("false");
    });

    it("allows selecting Part Time and Foreign Worker", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.click(
            screen.getByRole("button", { name: "Foreign Worker" }),
        );

        expect(
            screen
                .getByRole("button", { name: "Part Time" })
                .getAttribute("aria-pressed"),
        ).toBe("true");
        expect(
            screen
                .getByRole("button", { name: "Foreign Worker" })
                .getAttribute("aria-pressed"),
        ).toBe("true");
    });

    it("accepts typing into optional identity fields (NRIC, Country of Origin, Race)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^NRIC/), "S9999999Z");
        await user.type(
            screen.getByLabelText(/^Country of Origin/),
            "Malaysia",
        );
        await user.type(screen.getByLabelText(/^Race/), "Malay");

        expect((screen.getByLabelText(/^NRIC/) as HTMLInputElement).value).toBe(
            "S9999999Z",
        );
        expect(
            (screen.getByLabelText(/^Country of Origin/) as HTMLInputElement)
                .value,
        ).toBe("Malaysia");
        expect((screen.getByLabelText(/^Race/) as HTMLInputElement).value).toBe(
            "Malay",
        );
    });

    it("shows email format validation when value is not a valid email", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^Email/), "not-an-email");
        await user.tab();

        expect(
            await screen.findByText("Enter a valid email address"),
        ).toBeTruthy();
    });

    it("allows phone values with non-digit characters (no digits-only error)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^Phone/), "+65 8123 4567");
        await user.tab();

        expect(
            screen.queryByText(
                "Phone must contain digits only (no decimals or other characters)",
            ),
        ).toBeNull();
    });

    it("rejects monthly pay with more than two decimal places (full time)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByLabelText(/^Monthly Pay/));
        await user.type(screen.getByLabelText(/^Monthly Pay/), "10.123");
        await user.tab();

        expect(
            await screen.findByText(
                "Monthly pay must use at most two decimal places",
            ),
        ).toBeTruthy();
    });

    it("rejects minimum working hours that are not whole numbers (full time)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByLabelText(/^Minimum Working Hours/));
        await user.type(
            screen.getByLabelText(/^Minimum Working Hours/),
            "40.5",
        );
        await user.tab();

        expect(
            await screen.findByText(
                "Minimum working hours must be a whole number with no decimals",
            ),
        ).toBeTruthy();
    });

    it("rejects part-time hourly rate with more than two decimal places", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText(/^Hourly Rate/), "12.123");
        await user.tab();

        expect(
            await screen.findByText(
                "Hourly rate must use at most two decimal places",
            ),
        ).toBeTruthy();
    });

    it("rejects CPF with more than two decimal places when filled (local worker)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^CPF/), "1.123");
        await user.tab();

        expect(
            await screen.findByText(
                "CPF must use at most two decimal places and cannot be negative",
            ),
        ).toBeTruthy();
    });

    it("shows create-mode validation messages for full-time fields after fields are touched", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByLabelText(/^Name/));
        await user.tab();

        expect(await screen.findByText("Name is required")).toBeTruthy();

        await user.click(screen.getByLabelText(/^Monthly Pay/));
        await user.tab();
        expect(
            await screen.findByText(
                "Monthly pay is required for full time workers",
            ),
        ).toBeTruthy();

        await user.click(screen.getByLabelText(/^Hourly Rate/));
        await user.tab();
        expect(
            await screen.findByText(
                "Hourly rate is required for full time workers",
            ),
        ).toBeTruthy();

        await user.click(screen.getByLabelText(/^Rest Day Rate/));
        await user.tab();
        expect(
            await screen.findByText(
                "Rest day rate is required for full time workers",
            ),
        ).toBeTruthy();

        await user.click(screen.getByLabelText(/^Minimum Working Hours/));
        await user.tab();
        expect(
            screen.queryByText(
                "Minimum working hours are required for full time workers",
            ),
        ).toBeNull();
    });

    it("shows CPF for Full Time + Local Worker and hides CPF for Full Time + Foreign Worker", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        expect(screen.getByLabelText(/^CPF/)).toBeTruthy();

        await user.click(
            screen.getByRole("button", { name: "Foreign Worker" }),
        );

        expect(screen.queryByLabelText(/^CPF/)).toBeNull();
    });

    it("requires positive hourly rate for part-time workers", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText(/^Name/), "Part Time Candidate");
        await user.clear(screen.getByLabelText(/^Hourly Rate/));
        await user.type(screen.getByLabelText(/^Hourly Rate/), "0");

        await user.click(
            screen.getByRole("button", { name: "Add New Worker" }),
        );

        expect(
            await screen.findByText("Hourly rate must be a positive number"),
        ).toBeTruthy();
    });

    it("requires bank account number when payment method is bank transfer", async () => {
        const user = userEvent.setup();
        render(
            <WorkerForm
                worker={makeWorkerWithEmployment({
                    paymentMethod: "Bank Transfer",
                    bankAccountNumber: "",
                })}
            />,
        );

        expect(
            (
                screen.getByRole("button", {
                    name: "Save changes",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);

        await user.click(screen.getByLabelText(/^Bank Account Number/));
        await user.tab();

        expect(
            await screen.findByText(
                "Bank account number is required for bank transfer",
            ),
        ).toBeTruthy();
    });

    it("shows Bank Account Number when payment method is Bank Transfer (create mode)", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByLabelText(/Payment Method/i));
        const listbox = await screen.findByRole("listbox");
        await user.click(within(listbox).getByText("Bank Transfer"));

        expect(screen.getByLabelText(/^Bank Account Number/)).toBeTruthy();
    });

    it("prefills PayNow from Phone (full trimmed string) when switching to PayNow, otherwise leaves it blank", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^Phone/), "+65 9000 1111");
        await user.click(screen.getByLabelText(/Payment Method/i));
        let listbox = await screen.findByRole("listbox");
        await user.click(within(listbox).getByText("PayNow"));

        expect(
            (
                screen.getByRole("textbox", {
                    name: /PayNow/,
                }) as HTMLInputElement
            ).value,
        ).toBe("+65 9000 1111");

        await user.click(screen.getByLabelText(/Payment Method/i));
        listbox = await screen.findByRole("listbox");
        await user.click(within(listbox).getByText("Cash"));

        await user.clear(screen.getByLabelText(/^Phone/));
        await user.click(screen.getByLabelText(/Payment Method/i));
        listbox = await screen.findByRole("listbox");
        await user.click(within(listbox).getByText("PayNow"));

        expect(
            (
                screen.getByRole("textbox", {
                    name: /PayNow/,
                }) as HTMLInputElement
            ).value,
        ).toBe("");
    });

    it("requires paynow phone when payment method is PayNow", async () => {
        const user = userEvent.setup();
        render(
            <WorkerForm
                worker={makeWorkerWithEmployment({
                    paymentMethod: "PayNow",
                    payNowPhone: "",
                })}
            />,
        );

        expect(
            (
                screen.getByRole("button", {
                    name: "Save changes",
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);

        await user.click(screen.getByRole("textbox", { name: /PayNow/ }));
        await user.tab();

        expect(
            await screen.findByText(
                "PayNow number is required when payment method is PayNow",
            ),
        ).toBeTruthy();
    });

    it("honors disabled mode (read-only): no submit button and disabled fields", () => {
        render(<WorkerForm worker={makeWorkerWithEmployment()} disabled />);

        expect(
            screen.queryByRole("button", { name: "Save changes" }),
        ).toBeNull();
        expect(
            screen.queryByRole("button", { name: "Add New Worker" }),
        ).toBeNull();
        expect(
            (screen.getByLabelText(/^Name/) as HTMLInputElement).disabled,
        ).toBe(true);
        expect(
            (screen.getByLabelText(/^Email/) as HTMLInputElement).disabled,
        ).toBe(true);
        expect(
            (screen.getByLabelText(/^Phone/) as HTMLInputElement).disabled,
        ).toBe(true);
    });

    it("allows full time create with empty minimum working hours and omits it from the payload", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.type(screen.getByLabelText(/^Name/), "Full Time No Min");
        await user.type(screen.getByLabelText(/^Monthly Pay/), "3000");
        await user.type(screen.getByLabelText(/^Hourly Rate/), "10");
        await user.type(screen.getByLabelText(/^Rest Day Rate/), "100");
        // Minimum Working Hours left empty

        const submit = screen.getByRole("button", {
            name: "Add New Worker",
        }) as HTMLButtonElement;
        expect(submit.disabled).toBe(false);

        await user.click(submit);

        await waitFor(() => {
            expect(mocks.createWorker).toHaveBeenCalledTimes(1);
        });

        const [payload] = mocks.createWorker.mock.calls[0] as [
            WorkerUpsertValues,
        ];
        expect(payload.employmentType).toBe("Full Time");
        expect(payload.minimumWorkingHours).toBeUndefined();
    });

    it("submits create flow through createWorker and navigates to worker list", async () => {
        const user = userEvent.setup();
        render(<WorkerForm />);

        await user.click(screen.getByRole("button", { name: "Part Time" }));
        await user.type(screen.getByLabelText(/^Name/), "Created Worker");
        await user.clear(screen.getByLabelText(/^Hourly Rate/));
        await user.type(screen.getByLabelText(/^Hourly Rate/), "12");

        await user.click(
            screen.getByRole("button", { name: "Add New Worker" }),
        );

        await waitFor(() => {
            expect(mocks.createWorker).toHaveBeenCalledTimes(1);
        });

        const [payload] = mocks.createWorker.mock.calls[0] as [
            WorkerUpsertValues,
        ];
        expect(payload.name).toBe("Created Worker");
        expect(payload.employmentType).toBe("Part Time");
        expect(payload.hourlyRate).toBe(12);
        expect(payload.shiftPattern).toBe("Day Shift");

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
        await user.type(screen.getByLabelText(/^Name/), "Created Worker");
        await user.clear(screen.getByLabelText(/^Hourly Rate/));
        await user.type(screen.getByLabelText(/^Hourly Rate/), "12");

        await user.click(
            screen.getByRole("button", { name: "Add New Worker" }),
        );

        expect(await screen.findByText("NRIC already exists")).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it("submits edit flow through updateWorker with worker id", async () => {
        const user = userEvent.setup();
        render(<WorkerForm worker={makeWorkerWithEmployment()} />);

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => {
            expect(mocks.updateWorker).toHaveBeenCalledTimes(1);
        });

        const [workerId, payload] = mocks.updateWorker.mock.calls[0] as [
            string,
            WorkerUpsertValues,
        ];
        expect(workerId).toBe("worker-1");
        expect(payload.name).toBe("Existing Worker");
        expect(payload.status).toBe("Active");
        expect(payload.shiftPattern).toBe("Day Shift");

        expect(mocks.push).toHaveBeenCalledWith("/dashboard/worker/all");
        expect(mocks.refresh).toHaveBeenCalled();
    });

    it("persists Night Shift via updateWorker when selected", async () => {
        const user = userEvent.setup();
        render(<WorkerForm worker={makeWorkerWithEmployment()} />);

        await user.click(screen.getByRole("button", { name: "Night Shift" }));
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => {
            expect(mocks.updateWorker).toHaveBeenCalledTimes(1);
        });

        const [, payload] = mocks.updateWorker.mock.calls[0] as [
            string,
            WorkerUpsertValues,
        ];
        expect(payload.shiftPattern).toBe("Night Shift");
    });
});
