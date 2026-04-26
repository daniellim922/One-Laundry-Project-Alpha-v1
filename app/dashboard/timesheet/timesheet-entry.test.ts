import { describe, expect, it } from "vitest";

import { timesheetEntryFormSchema } from "@/db/schemas/timesheet-entry";

const validBase = {
    workerId: "worker-1",
    dateIn: "2025-01-15",
    dateOut: "2025-01-15",
    timeIn: "09:00",
    timeOut: "17:00",
};

describe("timesheetEntryFormSchema", () => {
    it("accepts a same-day shift when time out is after time in", () => {
        const r = timesheetEntryFormSchema.safeParse(validBase);
        expect(r.success).toBe(true);
    });

    it("rejects when time out is not after time in for the chosen dates", () => {
        const r = timesheetEntryFormSchema.safeParse({
            ...validBase,
            timeIn: "17:00",
            timeOut: "09:00",
        });
        expect(r.success).toBe(false);
        if (r.success) {
            throw new Error("expected parse failure");
        }
        expect(r.error.flatten().fieldErrors.timeOut?.length).toBeGreaterThan(0);
    });

    it("allows overnight shifts when date out is the next calendar day", () => {
        const r = timesheetEntryFormSchema.safeParse({
            ...validBase,
            dateOut: "2025-01-16",
            timeIn: "22:00",
            timeOut: "06:00",
        });
        expect(r.success).toBe(true);
    });
});
