/** Single public holiday row for service / seed tests. */
export function makePublicHolidayRow(overrides?: Partial<{
    id: string;
    date: string;
    name: string;
}>) {
    return {
        id: "holiday-1",
        date: "2026-01-01",
        name: "New Year's Day",
        ...overrides,
    };
}
