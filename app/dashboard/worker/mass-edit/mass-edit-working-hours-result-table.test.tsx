import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MassEditWorkingHoursResultTable } from "@/app/dashboard/worker/mass-edit/mass-edit-working-hours-result-table";

describe("MassEditWorkingHoursResultTable", () => {
    it("renders headers, formatted hours, and emoji status", () => {
        const html = renderToStaticMarkup(
            <MassEditWorkingHoursResultTable
                rows={[
                    {
                        workerId: "worker-1",
                        name: "Alice",
                        employmentArrangement: "Foreign Worker",
                        oldWorkingHours: 240,
                        newWorkingHours: 260,
                        status: "updated",
                    },
                    {
                        workerId: "worker-2",
                        name: "Bob",
                        employmentArrangement: "Local Worker",
                        oldWorkingHours: null,
                        newWorkingHours: null,
                        status: "failed",
                    },
                ]}
            />,
        );

        expect(html).toContain("Name");
        expect(html).toContain("Employment Arrangement");
        expect(html).toContain("Old Working Hours");
        expect(html).toContain("New Working Hours");
        expect(html).toContain("Status");
        expect(html).toContain("Foreign Worker");
        expect(html).toContain("Local Worker");
        expect(html).toContain("240h");
        expect(html).toContain("260h");
        expect(html).toContain("—");
        expect(html).toContain("✅ Updated");
        expect(html).toContain("❌ Failed");
    });
});
