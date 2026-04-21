import { expect, type Page } from "@playwright/test";

import type {
    JuneTimesheetEntryPayload,
    TimesheetUserflowHandoff,
} from "./timesheet-userflow-helpers";
import { buildTimesheetRowSignature } from "./timesheet-userflow-helpers";

export async function fillTimesheetCreateForm(
    page: Page,
    entry: JuneTimesheetEntryPayload,
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
    entry: JuneTimesheetEntryPayload,
): Promise<void> {
    await page.goto("/dashboard/timesheet/new");
    await expect(
        page.getByRole("heading", { name: "Add new timesheet" }),
    ).toBeVisible();

    await fillTimesheetCreateForm(page, entry);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/);
    await expect(
        page.getByRole("heading", { name: "All timesheets" }),
    ).toBeVisible();
}

export async function cleanupExistingTimesheetDataset(
    page: Page,
    dataset: TimesheetUserflowHandoff,
): Promise<void> {
    for (const worker of dataset.workers) {
        await page.goto("/dashboard/timesheet/all");
        await expect(
            page.getByRole("heading", { name: "All timesheets" }),
        ).toBeVisible();

        const searchInput = getTimesheetSearchInput(page);

        await searchInput.fill(worker.workerName);

        for (const entry of worker.entries) {
            await deleteAllMatchingTimesheetRows(
                page,
                buildTimesheetRowSignature(entry),
            );
        }
    }
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
        const searchInput = getTimesheetSearchInput(page);

        await searchInput.fill(worker.workerName);
        await expect(
            getTimesheetTable(page)
                .getByRole("cell", { name: worker.workerName })
                .first(),
        ).toBeVisible();

        const actualSignatures = await collectVisibleRowSignaturesAcrossPages(page);
        const expectedSignatures = worker.entries.map((entry) =>
            buildTimesheetRowSignature(entry),
        );

        expect(countMatchingSignatures(actualSignatures, expectedSignatures)).toEqual(
            buildExpectedSignatureCounts(expectedSignatures),
        );
    }
}

export async function collectVisibleRowSignaturesAcrossPages(
    page: Page,
): Promise<string[]> {
    const signatures: string[] = [];

    for (;;) {
        signatures.push(...(await readVisibleRowSignatures(page)));

        const nextButton = getNextPaginationButton(page);

        if ((await nextButton.count()) === 0 || (await nextButton.isDisabled())) {
            return signatures;
        }

        await nextButton.click();
    }
}

async function readVisibleRowSignatures(page: Page): Promise<string[]> {
    return getTimesheetTable(page).locator("tbody tr").evaluateAll((rows) =>
        rows.map((row) => {
            const cells = Array.from(row.querySelectorAll("td")).map((cell) =>
                cell.textContent?.trim() ?? "",
            );

            return cells.slice(0, 6).join(" | ");
        }),
    );
}

function countMatchingSignatures(
    actualSignatures: string[],
    expectedSignatures: string[],
): Record<string, number> {
    const expectedSignatureSet = new Set(expectedSignatures);

    return actualSignatures.reduce<Record<string, number>>((counts, signature) => {
        if (!expectedSignatureSet.has(signature)) {
            return counts;
        }

        counts[signature] = (counts[signature] ?? 0) + 1;

        return counts;
    }, {});
}

function buildExpectedSignatureCounts(
    expectedSignatures: string[],
): Record<string, number> {
    return expectedSignatures.reduce<Record<string, number>>((counts, signature) => {
        counts[signature] = (counts[signature] ?? 0) + 1;

        return counts;
    }, {});
}

async function deleteAllMatchingTimesheetRows(
    page: Page,
    expectedSignature: string,
): Promise<void> {
    for (;;) {
        const matchingRow = await findMatchingRow(page, expectedSignature);

        if (!matchingRow) {
            return;
        }

        await matchingRow.getByRole("button", { name: "Open row actions" }).click();
        await page.getByRole("menuitem", { name: "Delete" }).click();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Delete", exact: true })
            .click();

        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(matchingRow).not.toBeVisible();
    }
}

async function findMatchingRow(
    page: Page,
    expectedSignature: string,
) {
    for (;;) {
        const rows = getTimesheetTable(page).locator("tbody tr");
        const rowCount = await rows.count();

        for (let index = 0; index < rowCount; index += 1) {
            const row = rows.nth(index);
            const signature = await readRowSignature(row);

            if (signature === expectedSignature) {
                return row;
            }
        }

        const nextButton = getNextPaginationButton(page);

        if ((await nextButton.count()) === 0 || (await nextButton.isDisabled())) {
            return null;
        }

        await nextButton.click();
    }
}

async function readRowSignature(row: ReturnType<Page["locator"]>): Promise<string> {
    const cells = await row.locator("td").allTextContents();

    return cells.slice(0, 6).map((cell) => cell.trim()).join(" | ");
}

export function getTimesheetSearchInput(page: Page) {
    return page.getByRole("main").getByPlaceholder("Search...");
}

export function getTimesheetTable(page: Page) {
    return page.getByRole("main").getByRole("table");
}

function getNextPaginationButton(page: Page) {
    return page.getByRole("main").getByRole("button", {
        name: "Next",
        exact: true,
    });
}

function toDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");

    return `${day}/${month}/${year}`;
}
