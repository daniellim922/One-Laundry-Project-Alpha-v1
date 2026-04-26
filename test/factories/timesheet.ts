/** Minimal open timesheet row for assertions (calendar dates as ISO strings). */
export function makeTimesheetRow(overrides?: Partial<{
    id: string;
    workerId: string;
    dateIn: string;
    timeIn: string;
    dateOut: string;
    timeOut: string;
    status: string;
}>) {
    return {
        id: "timesheet-1",
        workerId: "worker-1",
        dateIn: "2026-01-02",
        timeIn: "09:00:00",
        dateOut: "2026-01-02",
        timeOut: "17:00:00",
        status: "Open",
        ...overrides,
    };
}
