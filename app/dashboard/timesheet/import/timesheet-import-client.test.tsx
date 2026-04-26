/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

const { importAttendRecordTimesheetMock } = vi.hoisted(() => ({
    importAttendRecordTimesheetMock: vi.fn(),
}));

vi.mock("@/utils/payroll/parse-attendrecord", () => ({
    parseAttendRecord: parseAttendRecordMock,
}));

vi.mock("./import-attend-record-timesheet", () => ({
    importAttendRecordTimesheet: importAttendRecordTimesheetMock,
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ back: vi.fn() }),
}));

import { TimesheetImportClient } from "./timesheet-import-client";

beforeEach(() => {
    class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

    it("enables upload after manually mapping an unresolved imported name and submits the selected worker name", async () => {
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
                    name: "Alicia Tan",
                    dates: [
                        {
                            dateIn: "01/01/2026",
                            timeIn: "09:00",
                            dateOut: "01/01/2026",
                            timeOut: "17:00",
                        },
                        {
                            dateIn: "02/01/2026",
                            timeIn: "09:00",
                            dateOut: "02/01/2026",
                            timeOut: "17:00",
                        },
                    ],
                },
            ],
        };

        parseAttendRecordMock.mockReturnValue(parsedAttendRecord);
        importAttendRecordTimesheetMock.mockResolvedValue({ imported: 2 });

        render(
            <TimesheetImportClient
                workers={[
                    {
                        id: "worker-1",
                        name: "Alice Tan",
                        status: "Active",
                    },
                    {
                        id: "worker-2",
                        name: "Inactive Alice",
                        status: "Inactive",
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

        const uploadButton = await screen.findByRole("button", {
            name: "Upload Timesheet",
        });
        expect((uploadButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole("combobox"));
        fireEvent.click(await screen.findByText("Alice Tan"));

        expect(
            screen.getByText(
                (_content, element) =>
                    element?.textContent === "Source: Alicia Tan",
            ),
        ).toBeDefined();
        expect(
            screen
                .getByRole("combobox")
                .textContent?.includes("Alice Tan"),
        ).toBe(true);
        expect((uploadButton as HTMLButtonElement).disabled).toBe(false);

        await user.click(uploadButton);

        expect(importAttendRecordTimesheetMock).toHaveBeenCalledWith({
            attendanceDate: parsedAttendRecord.attendanceDate,
            tablingDate: parsedAttendRecord.tablingDate,
            workers: [
                {
                    userId: "",
                    name: "Alice Tan",
                    dates: [
                        {
                            dateIn: "01/01/2026",
                            timeIn: "09:00",
                            dateOut: "01/01/2026",
                            timeOut: "17:00",
                        },
                        {
                            dateIn: "02/01/2026",
                            timeIn: "09:00",
                            dateOut: "02/01/2026",
                            timeOut: "17:00",
                        },
                    ],
                },
            ],
        });
        expect(await screen.findByText("Imported 2 entries.")).toBeDefined();
        expect(screen.queryByText("attend-record.xls")).toBeNull();
    });

    it("keeps backend unknown-worker import errors visible when the API returns them", async () => {
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
                    name: "Alice Tan",
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
        importAttendRecordTimesheetMock.mockResolvedValue({
            imported: 0,
            errors: ["Unknown worker: Alice Tan"],
        });

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

        await user.click(
            await screen.findByRole("button", {
                name: "Upload Timesheet",
            }),
        );

        expect(
            await screen.findByText("Unknown worker: Alice Tan"),
        ).toBeDefined();
    });
});
