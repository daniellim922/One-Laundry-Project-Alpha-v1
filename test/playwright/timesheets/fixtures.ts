import type { Page } from "@playwright/test";

export async function gotoTimesheetOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/timesheet");
    await page.getByRole("heading", { name: "Timesheet" }).waitFor();
}
