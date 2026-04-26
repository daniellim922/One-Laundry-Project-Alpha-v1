/** @vitest-environment jsdom */

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AttendRecordOutput } from "@/utils/payroll/parse-attendrecord";

vi.mock("xlsx", () => ({
    read: vi.fn(() => ({
        SheetNames: ["AttendRecord"],
        Sheets: {
            AttendRecord: {},
        },
    })),
    utils: {
        sheet_to_json: vi.fn(() => []),
    },
}));

const { parseAttendRecordMock } = vi.hoisted(() => ({
    parseAttendRecordMock: vi.fn(),
}));

vi.mock("@/utils/payroll/parse-attendrecord", () => ({
    parseAttendRecord: parseAttendRecordMock,
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ back: vi.fn() }),
}));

import { TimesheetImportClient } from "./timesheet-import-client";

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("TimesheetImportClient", () => {
    it("disables upload and shows unresolved worker matches when imported names do not resolve", async () => {
        const user = userEvent.setup();
        const parsedAttendRecord: AttendRecordOutput = {
            attendanceDate: {
                startDate: "01/01/2026",
                endDate: "01/01/2026",
            },
            tablingDate: "01/01/2026 17:00:00",
            workers: [
                {
                    userId: "",
                    name: "Unknown Worker",
                    dates: [
                        {
                            dateIn: "01/01/2026",
                            timeIn: "09:00",
                            dateOut: "01/01/2026",
                            timeOut: "17:00",
                        },
                    ],
                },
            ],
        };

        parseAttendRecordMock.mockReturnValue(parsedAttendRecord);

        render(
            <TimesheetImportClient
                workers={[
                    {
                        id: "worker-1",
                        name: "Alice Tan",
                        status: "Active",
                    },
                ]}
            />,
        );

        await user.upload(
            screen.getByLabelText(/Drag and drop or click to upload/i),
            new File(["legacy attend record"], "attend-record.xls", {
                type: "application/vnd.ms-excel",
            }),
        );

        expect(
            await screen.findByText("Unresolved worker matches"),
        ).toBeDefined();
        expect(screen.getAllByText("Unknown Worker").length).toBeGreaterThan(0);

        const uploadButton = screen.getByRole("button", {
            name: "Upload Timesheet",
        }) as HTMLButtonElement;

        expect(uploadButton.disabled).toBe(true);
    });
});
