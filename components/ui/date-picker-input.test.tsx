/** @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePickerInput } from "@/components/ui/date-picker-input";

afterEach(() => {
    cleanup();
});

describe("DatePickerInput", () => {
    it("shows DD/MM/YYYY for a controlled ISO value", () => {
        render(
            <DatePickerInput
                id="d1"
                value="2026-04-06"
                onValueChange={() => {}}
            />,
        );
        expect(screen.getByDisplayValue("06/04/2026")).toBeDefined();
    });

    it("emits ISO when a complete valid DMY is typed", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <DatePickerInput id="d2" value="" onValueChange={onValueChange} />,
        );
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "15032026");
        expect(onValueChange.mock.calls).toContainEqual(["2026-03-15"]);
    });

    it("clamps typed date to min", async () => {
        const user = userEvent.setup();
        const onValueChange = vi.fn();
        render(
            <DatePickerInput
                id="d3"
                value=""
                min="2026-02-01"
                onValueChange={onValueChange}
            />,
        );
        const input = screen.getByRole("textbox");
        await user.clear(input);
        await user.type(input, "01012026");
        expect(onValueChange.mock.calls).toContainEqual(["2026-02-01"]);
    });
});
