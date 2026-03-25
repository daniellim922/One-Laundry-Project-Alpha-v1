/** Server- and client-safe date/time display for timesheet rows and view page. */

export function formatTimesheetRowDate(d: string): string {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatTimesheetRowTime(t: string): string {
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}
