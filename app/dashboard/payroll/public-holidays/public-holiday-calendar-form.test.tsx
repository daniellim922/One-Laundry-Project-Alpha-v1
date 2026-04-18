/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    savePublicHolidayYear: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mocks.push,
        refresh: mocks.refresh,
    }),
}));

vi.mock("@/app/dashboard/payroll/public-holidays/actions", () => ({
    savePublicHolidayYear: (...args: unknown[]) =>
        mocks.savePublicHolidayYear(...args),
}));

vi.mock("@/components/ui/date-picker-input", () => ({
    DatePickerInput: ({
        id,
        value,
        onValueChange,
        disabled,
        "aria-invalid": ariaInvalid,
    }: {
        id?: string;
        value?: string;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
        "aria-invalid"?: boolean;
    }) => (
        <input
            id={id}
            type="date"
            value={value ?? ""}
            onChange={(event) => onValueChange?.(event.target.value)}
            disabled={disabled}
            aria-invalid={ariaInvalid}
        />
    ),
}));

import { PublicHolidayCalendarForm } from "@/app/dashboard/payroll/public-holidays/public-holiday-calendar-form";

describe("PublicHolidayCalendarForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.savePublicHolidayYear.mockResolvedValue({
            success: true,
            saved: 2,
        });
    });

    it("loads another year through the payroll subpage route", async () => {
        const user = userEvent.setup();

        render(
            <PublicHolidayCalendarForm
                year={2026}
                holidays={[{ id: "holiday-1", date: "2026-01-01", name: "New Year's Day" }]}
            />,
        );

        await user.clear(screen.getByLabelText("Calendar year"));
        await user.type(screen.getByLabelText("Calendar year"), "2027");
        await user.click(screen.getByRole("button", { name: "Load year" }));

        expect(mocks.push).toHaveBeenCalledWith(
            "/dashboard/payroll/public-holidays?year=2027",
        );
        expect(mocks.refresh).toHaveBeenCalled();
    });

    it("lets the operator add, edit, remove, and save holiday rows", async () => {
        const user = userEvent.setup();
        mocks.savePublicHolidayYear.mockResolvedValueOnce({
            success: true,
            saved: 1,
        });

        render(
            <PublicHolidayCalendarForm
                year={2026}
                holidays={[{ id: "holiday-1", date: "2026-01-01", name: "New Year's Day" }]}
            />,
        );

        await user.click(
            screen.getAllByRole("button", { name: "Add holiday" })[0]!,
        );

        const dateInputs = screen.getAllByLabelText("Holiday date");
        const nameInputs = screen.getAllByLabelText("Holiday name");
        await user.type(dateInputs[1]!, "2026-05-01");
        await user.type(nameInputs[1]!, "Labour Day");

        await user.clear(nameInputs[0]!);
        await user.type(nameInputs[0]!, "New Year's Day (Observed)");

        await user.click(
            screen.getAllByRole("button", { name: /Remove holiday/ })[0]!,
        );
        await user.click(
            screen.getAllByRole("button", { name: "Save year" })[0]!,
        );

        expect(mocks.savePublicHolidayYear).toHaveBeenCalledWith({
            year: 2026,
            holidays: [{ date: "2026-05-01", name: "Labour Day" }],
        });
        expect(await screen.findByText("Saved 1 holiday for 2026.")).toBeTruthy();
    });
});
