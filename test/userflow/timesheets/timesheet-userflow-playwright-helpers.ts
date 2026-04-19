import { expect, type Page } from "@playwright/test";

import type { MarchTimesheetEntryPayload } from "./timesheet-userflow-helpers";

export async function fillTimesheetCreateForm(
    page: Page,
    entry: MarchTimesheetEntryPayload,
): Promise<void> {
    await page.getByRole("combobox", { name: "Worker" }).click();
    await page.getByPlaceholder(/Search workers/i).fill(entry.workerName);
    await page
        .getByRole("option", { name: entry.workerName, exact: true })
        .click();

    await page.getByLabel("Date in").fill(toDisplayDate(entry.dateIn));
    await page.getByLabel("Date out").fill(toDisplayDate(entry.dateOut));
    await page.getByLabel("Time in").fill(entry.timeIn);
    await page.getByLabel("Time out").fill(entry.timeOut);

    await expect(
        page.locator("div").filter({ hasText: /^Total hours:\s+\d+\.\d{2}$/ }),
    ).toContainText(entry.totalHours.toFixed(2));
}

export async function createTimesheetEntryThroughForm(
    page: Page,
    entry: MarchTimesheetEntryPayload,
): Promise<void> {
    await page.goto("/dashboard/timesheet/new");
    await expect(
        page.getByRole("heading", { name: "Add new timesheet" }),
    ).toBeVisible();

    await fillTimesheetCreateForm(page, entry);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/, {
        timeout: 15_000,
    });
    await expect(
        page.getByRole("heading", { name: "All timesheets" }),
    ).toBeVisible();
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
