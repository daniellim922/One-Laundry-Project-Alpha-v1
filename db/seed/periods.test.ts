import { describe, expect, it } from "vitest";

import {
    openTimesheetSeedPeriods,
    seedPeriods,
    settledHistoricalPayrollSeedPeriods,
} from "./periods";

describe("seed period windows", () => {
    it("names the settled payroll history and open timesheet windows explicitly", () => {
        expect(settledHistoricalPayrollSeedPeriods.map((period) => period.key)).toEqual([
            "2025-04",
            "2025-05",
            "2025-06",
            "2025-07",
            "2025-08",
            "2025-09",
            "2025-10",
            "2025-11",
            "2025-12",
        ]);

        expect(openTimesheetSeedPeriods.map((period) => period.key)).toEqual([
            "2026-01",
            "2026-02",
            "2026-03",
        ]);
    });

    it("keeps the legacy seed period export scoped to settled payroll history", () => {
        expect(seedPeriods).toBe(settledHistoricalPayrollSeedPeriods);
    });
});
