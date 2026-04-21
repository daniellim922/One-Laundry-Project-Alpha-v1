import path from "node:path";

import { expect, type Page } from "@playwright/test";

import type { AttendRecordArtifactHandoff } from "./attendrecord-artifact-helpers";
import { getTimesheetTable } from "./timesheet-userflow-playwright-helpers";

type AttendRecordPreviewWorkerGroupExpectation = {
    workerLabel: string;
    rowCount: number;
};

export function buildExpectedImportPreviewWorkerGroups(
    artifact: AttendRecordArtifactHandoff,
): AttendRecordPreviewWorkerGroupExpectation[] {
    return artifact.workers.map((worker) => ({
        workerLabel: worker.workerAlias,
        rowCount: worker.totalImportedRows,
    }));
}

export async function uploadAttendRecordWorkbook(
    page: Page,
    artifact: AttendRecordArtifactHandoff,
): Promise<void> {
    await page.goto("/dashboard/timesheet/import");
    await expect(
        page.getByRole("heading", { name: "Import timesheet" }).first(),
    ).toBeVisible();

    await page
        .locator('input[type="file"]')
        .setInputFiles(artifact.workbookPath);

    await expect(
        page.getByText(path.basename(artifact.workbookPath), { exact: true }),
    ).toBeVisible();
}

export async function assertImportPreviewBeforeRemapping(
    page: Page,
    artifact: AttendRecordArtifactHandoff,
): Promise<void> {
    await expect(
        page.getByText(
            `Attendance period: ${artifact.attendanceDate.startDate} ~ ${artifact.attendanceDate.endDate}`,
            { exact: true },
        ),
    ).toBeVisible();
    await expect(
        page.getByText(`Tabling date: ${artifact.tablingDate}`, { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText(
            `${artifact.workers.length} workers, ${artifact.expectedRowCount} entries total`,
            { exact: true },
        ),
    ).toBeVisible();

    expect(await readRenderedPreviewWorkerGroups(page)).toEqual(
        buildExpectedImportPreviewWorkerGroups(artifact),
    );

    for (const worker of artifact.workers) {
        await expect(getPreviewWorkerCombobox(page, worker.workerAlias)).toBeVisible();
    }
}

export async function remapImportPreviewWorkers(
    page: Page,
    artifact: AttendRecordArtifactHandoff,
): Promise<void> {
    for (const worker of artifact.workers) {
        const combobox = getPreviewWorkerCombobox(page, worker.workerAlias);

        await closeVisibleWorkerSearchPopovers(page);
        await combobox.click();

        const searchInput = getVisibleWorkerSearchInput(page);

        await expect(searchInput).toBeVisible();
        await searchInput.fill(worker.workerName);
        await getVisibleWorkerOption(page, worker.workerName).click();

        await expect(getPreviewWorkerRow(page, worker.workerName)).toBeVisible();
        await closeVisibleWorkerSearchPopovers(page);
    }
}

export async function submitAttendRecordImport(
    page: Page,
    artifact: AttendRecordArtifactHandoff,
): Promise<void> {
    await page.getByRole("button", { name: "Upload Timesheet" }).click();

    await expect(
        page.getByText(`Imported ${artifact.expectedRowCount} entries.`, {
            exact: true,
        }),
    ).toBeVisible();
}

async function readRenderedPreviewWorkerGroups(
    page: Page,
): Promise<AttendRecordPreviewWorkerGroupExpectation[]> {
    return getTimesheetTable(page)
        .locator("tbody tr")
        .evaluateAll((rows) => {
            const groups: { workerLabel: string; rowCount: number }[] = [];

            for (const row of rows) {
                const firstCellText =
                    row.querySelector("td")?.textContent
                        ?.replace(/\s+/g, " ")
                        .trim() ?? "";

                if (firstCellText && firstCellText !== "└") {
                    groups.push({
                        workerLabel: firstCellText,
                        rowCount: 1,
                    });
                    continue;
                }

                const currentGroup = groups.at(-1);

                if (currentGroup) {
                    currentGroup.rowCount += 1;
                }
            }

            return groups;
        });
}

function getPreviewWorkerCombobox(page: Page, workerLabel: string) {
    return getPreviewWorkerRow(page, workerLabel).getByRole("combobox");
}

function getPreviewWorkerRow(page: Page, workerLabel: string) {
    return getTimesheetTable(page)
        .locator("tbody tr")
        .filter({
            has: page.getByText(workerLabel, { exact: true }),
        })
        .first();
}

function getVisibleWorkerSearchInput(page: Page) {
    return page.locator('input[placeholder^="Search workers"]:visible').last();
}

function getVisibleWorkerOption(page: Page, workerName: string) {
    return page
        .locator('[role="option"]:visible')
        .filter({ hasText: workerName })
        .last();
}

async function closeVisibleWorkerSearchPopovers(page: Page): Promise<void> {
    const visibleSearchInputs = page.locator(
        'input[placeholder^="Search workers"]:visible',
    );
    const openCount = await visibleSearchInputs.count();

    for (let index = 0; index < openCount; index += 1) {
        await page.keyboard.press("Escape");
    }
}
