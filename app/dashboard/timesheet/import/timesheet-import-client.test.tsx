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

const nextNavBackMocks = vi.hoisted(() => ({
    back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ back: nextNavBackMocks.back }),
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
        importAttendRecordTimesheetMock.mockResolvedValue({
            status: "success",
            imported: 2,
            skipped: 0,
        });

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

        expect(importAttendRecordTimesheetMock).toHaveBeenCalledWith(
            {
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
            },
            undefined,
        );
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
            status: "success",
            imported: 0,
            skipped: 0,
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

    it("allows duplicate manual worker mappings to remain visible without blocking upload", async () => {
        const user = userEvent.setup();
        const parsedAttendRecord: AttendRecordOutput = {
            attendanceDate: {
                startDate: "01/01/2026",
                endDate: "02/01/2026",
            },
            tablingDate: "02/01/2026 17:00:00",
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
                    ],
                },
                {
                    userId: "",
                    name: "Alice T.",
                    dates: [
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

        const uploadButton = await screen.findByRole("button", {
            name: "Upload Timesheet",
        });
        expect((uploadButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getAllByRole("combobox")[0]!);
        {
            const aliceOptions = await screen.findAllByText("Alice Tan");
            fireEvent.click(aliceOptions[aliceOptions.length - 1]!);
        }
        fireEvent.click(screen.getAllByRole("combobox")[1]!);
        {
            const aliceOptions = await screen.findAllByText("Alice Tan");
            fireEvent.click(aliceOptions[aliceOptions.length - 1]!);
        }

        expect(
            screen.getByText(
                (_content, element) =>
                    element?.textContent === "Source: Alicia Tan",
            ),
        ).toBeDefined();
        expect(
            screen.getByText(
                (_content, element) =>
                    element?.textContent === "Source: Alice T.",
            ),
        ).toBeDefined();
        expect(
            screen
                .getAllByRole("combobox")
                .every((combobox) =>
                    combobox.textContent?.includes("Alice Tan"),
                ),
        ).toBe(true);
        expect((uploadButton as HTMLButtonElement).disabled).toBe(false);
    });

    it("shows overlapping dates prompt and re-submits with skip mode", async () => {
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
        importAttendRecordTimesheetMock
            .mockResolvedValueOnce({
                status: "confirmation_required",
                overlaps: [
                    {
                        workerName: "Alice Tan",
                        dateIn: "2026-01-01",
                        existingCount: 1,
                    },
                ],
            })
            .mockResolvedValueOnce({
                status: "success",
                imported: 0,
                skipped: 1,
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

        const uploadButton = await screen.findByRole("button", {
            name: "Upload Timesheet",
        });
        await user.click(uploadButton);

        expect(
            await screen.findByText("Overlapping timesheet dates"),
        ).toBeDefined();
        expect((uploadButton as HTMLButtonElement).disabled).toBe(true);

        await user.click(screen.getByRole("button", { name: "Skip duplicates" }));

        const expectedPayload = {
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
                    ],
                },
            ],
        };
        expect(importAttendRecordTimesheetMock).toHaveBeenNthCalledWith(
            1,
            expectedPayload,
            undefined,
        );
        expect(importAttendRecordTimesheetMock).toHaveBeenNthCalledWith(
            2,
            expectedPayload,
            "skip",
        );
        expect(
            await screen.findByText(/No new entries imported. Skipped 1 duplicates/),
        ).toBeDefined();
    });

    it("clears manual worker matches when uploading a different file", async () => {
        const user = userEvent.setup();
        const firstFileAttendRecord: AttendRecordOutput = {
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
                    ],
                },
            ],
        };
        const secondFileAttendRecord: AttendRecordOutput = {
            attendanceDate: {
                startDate: "02/01/2026",
                endDate: "02/01/2026",
            },
            tablingDate: "02/01/2026 17:00:00",
            workers: [
                {
                    userId: "",
                    name: "Alicia Tan",
                    dates: [
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

        parseAttendRecordMock
            .mockReturnValueOnce(firstFileAttendRecord)
            .mockReturnValueOnce(secondFileAttendRecord);

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

        const fileInput = screen.getByLabelText(
            /Drag and drop or click to upload/i,
        );
        await user.upload(
            fileInput,
            new File(["first legacy attend record"], "january.xls", {
                type: "application/vnd.ms-excel",
            }),
        );

        const uploadButton = await screen.findByRole("button", {
            name: "Upload Timesheet",
        });
        fireEvent.click(screen.getByRole("combobox"));
        fireEvent.click(await screen.findByText("Alice Tan"));
        expect((uploadButton as HTMLButtonElement).disabled).toBe(false);

        await user.upload(
            fileInput,
            new File(["second legacy attend record"], "february.xls", {
                type: "application/vnd.ms-excel",
            }),
        );

        expect(await screen.findByText("february.xls")).toBeDefined();
        expect(
            await screen.findByText("Unresolved worker matches"),
        ).toBeDefined();
        expect(
            screen.getByRole("combobox").textContent?.includes("Alicia Tan"),
        ).toBe(true);
        expect(
            screen.getByRole("combobox").textContent?.includes("Alice Tan"),
        ).toBe(false);
        expect((uploadButton as HTMLButtonElement).disabled).toBe(true);
    });

    it("removes an unresolved worker blocker after deleting all rows for that imported name", async () => {
        const user = userEvent.setup();
        const parsedAttendRecord: AttendRecordOutput = {
            attendanceDate: {
                startDate: "01/01/2026",
                endDate: "02/01/2026",
            },
            tablingDate: "02/01/2026 17:00:00",
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
                {
                    userId: "",
                    name: "Unknown Worker",
                    dates: [
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

        const uploadButton = await screen.findByRole("button", {
            name: "Upload Timesheet",
        });
        expect(
            await screen.findByText("Unresolved worker matches"),
        ).toBeDefined();
        expect((uploadButton as HTMLButtonElement).disabled).toBe(true);

        await user.click(screen.getAllByLabelText("Delete entry")[1]!);

        expect(screen.queryByText("Unresolved worker matches")).toBeNull();
        expect(screen.queryByText("Unknown Worker")).toBeNull();
        expect((uploadButton as HTMLButtonElement).disabled).toBe(false);
    });
});
