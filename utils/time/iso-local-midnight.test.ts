import { describe, expect, it } from "vitest";

import { timesheetDateInKey } from "@/utils/time/iso-local-midnight";

describe("iso-local-midnight", () => {
    it("timesheetDateInKey normalizes ISO prefix and Date", () => {
        expect(timesheetDateInKey("2026-04-06")).toBe("2026-04-06");
        expect(timesheetDateInKey(new Date(2026, 3, 6))).toBe("2026-04-06");
    });
});
