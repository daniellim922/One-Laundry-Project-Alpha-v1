/** @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: vi.fn() }),
    usePathname: () => "/dashboard/worker/mass-edit",
    useSearchParams: () => new URLSearchParams(),
}));

import { MassEditWorkingHoursPanel } from "./mass-edit-working-hours-panel";

afterEach(() => {
    cleanup();
});

describe("MassEditWorkingHoursPanel", () => {
    it("renders description and worker table when workers are provided", () => {
        render(
            <MassEditWorkingHoursPanel
                workers={[
                    {
                        id: "w1",
                        name: "Test Worker",
                        status: "Active",
                        employmentType: "Full Time",
                        employmentArrangement: "Foreign Worker",
                        minimumWorkingHours: 250,
                    },
                ]}
            />,
        );

        expect(
            screen.getByText(
                "Select workers and set their minimum working hours. Only Active Full Time Foreign Workers are shown.",
            ),
        ).toBeDefined();
        expect(screen.getByText("Test Worker")).toBeDefined();
        expect(screen.getByText("Shared minimum hours")).toBeDefined();
        expect(
            screen.getByRole("button", { name: /Save selected/ }),
        ).toBeDefined();
    });
});
