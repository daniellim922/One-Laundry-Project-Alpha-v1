import { expect, type Page } from "@playwright/test";

import type {
    MarchTimesheetEntryPayload,
    TimesheetUserflowHandoff,
} from "./timesheet-userflow-helpers";
import { buildTimesheetRowSignature } from "./timesheet-userflow-helpers";

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

export async function verifyTimesheetDatasetInAllTimesheetsUi(
    page: Page,
    dataset: TimesheetUserflowHandoff,
): Promise<void> {
    await page.goto("/dashboard/timesheet/all");
    await expect(
        page.getByRole("heading", { name: "All timesheets" }),
    ).toBeVisible();

    for (const worker of dataset.workers) {
        const searchInput = page.getByPlaceholder("Search...");

        await searchInput.fill(worker.workerName);
        await expect(
            page.getByRole("cell", { name: worker.workerName }).first(),
        ).toBeVisible();

        const actualSignatures = await collectVisibleRowSignaturesAcrossPages(page);
        const expectedSignatures = worker.entries.map((entry) =>
            buildTimesheetRowSignature(entry),
        );

        expect(actualSignatures).toEqual(expectedSignatures);
    }
}

async function collectVisibleRowSignaturesAcrossPages(
    page: Page,
): Promise<string[]> {
    const signatures: string[] = [];
    const nextButton = page.getByRole("button", { name: "Next" });

    for (;;) {
        signatures.push(...(await readVisibleRowSignatures(page)));

        if (await nextButton.isDisabled()) {
            return signatures;
        }

        await nextButton.click();
    }
}

async function readVisibleRowSignatures(page: Page): Promise<string[]> {
    return page.locator("tbody tr").evaluateAll((rows) =>
        rows.map((row) => {
            const cells = Array.from(row.querySelectorAll("td")).map((cell) =>
                cell.textContent?.trim() ?? "",
            );

            return cells.slice(0, 6).join(" | ");
        }),
    );
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
