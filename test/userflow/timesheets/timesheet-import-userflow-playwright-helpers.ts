import path from "node:path";

import { expect, type Page } from "@playwright/test";

import type { FebruaryAttendRecordArtifactHandoff } from "./february-attendrecord-artifact-helpers";
import {
    collectVisibleRowSignaturesAcrossPages,
    getTimesheetSearchInput,
    getTimesheetTable,
} from "./timesheet-userflow-playwright-helpers";

type FebruaryPreviewWorkerGroupExpectation = {
    workerLabel: string;
    rowCount: number;
};

type FebruaryImportedRowsByWorker = {
    workerName: string;
    rowSignatures: string[];
};

export function buildExpectedFebruaryPreviewWorkerGroups(
    artifact: FebruaryAttendRecordArtifactHandoff,
): FebruaryPreviewWorkerGroupExpectation[] {
    return artifact.workers.map((worker) => ({
        workerLabel: worker.workerAlias,
        rowCount: worker.totalImportedRows,
    }));
}

export function buildExpectedFebruaryImportedRowsByWorker(
    artifact: FebruaryAttendRecordArtifactHandoff,
): FebruaryImportedRowsByWorker[] {
    return artifact.workers.map((worker) => ({
        workerName: worker.workerName,
        rowSignatures: worker.entries.map((entry) => entry.rowSignature),
    }));
}

export async function uploadFebruaryAttendRecordWorkbook(
    page: Page,
    artifact: FebruaryAttendRecordArtifactHandoff,
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

export async function assertFebruaryImportPreviewBeforeRemapping(
    page: Page,
    artifact: FebruaryAttendRecordArtifactHandoff,
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
        buildExpectedFebruaryPreviewWorkerGroups(artifact),
    );

    for (const worker of artifact.workers) {
        await expect(
            page.getByRole("combobox", {
                name: worker.workerAlias,
                exact: true,
            }),
        ).toBeVisible();
    }
}

export async function remapFebruaryImportPreviewWorkers(
    page: Page,
    artifact: FebruaryAttendRecordArtifactHandoff,
): Promise<void> {
    for (const worker of artifact.workers) {
        await page
            .getByRole("combobox", {
                name: worker.workerAlias,
                exact: true,
            })
            .click();
        await page.getByPlaceholder(/Search workers/i).fill(worker.workerName);
        await page
            .getByRole("option", { name: worker.workerName, exact: true })
            .click();

        await expect(
            page.getByRole("combobox", {
                name: worker.workerName,
                exact: true,
            }),
        ).toBeVisible();
    }
}

export async function submitFebruaryAttendRecordImport(
    page: Page,
    artifact: FebruaryAttendRecordArtifactHandoff,
): Promise<void> {
    await page.getByRole("button", { name: "Upload Timesheet" }).click();

    await expect(
        page.getByText(`Imported ${artifact.expectedRowCount} entries.`, {
            exact: true,
        }),
    ).toBeVisible();
}

export async function verifyFebruaryImportedRowsInAllTimesheetsUi(
    page: Page,
    artifact: FebruaryAttendRecordArtifactHandoff,
): Promise<void> {
    await page.goto("/dashboard/timesheet/all");
    await expect(
        page.getByRole("heading", { name: "All timesheets" }),
    ).toBeVisible();

    for (const expectedWorker of buildExpectedFebruaryImportedRowsByWorker(
        artifact,
    )) {
        const searchInput = getTimesheetSearchInput(page);

        await searchInput.fill(expectedWorker.workerName);
        await expect(
            getTimesheetTable(page)
                .getByRole("cell", { name: expectedWorker.workerName })
                .first(),
        ).toBeVisible();

        const actualSignatures = await collectVisibleRowSignaturesAcrossPages(page);
        const actualExpectedCounts = countMatchingSignatures(
            actualSignatures,
            expectedWorker.rowSignatures,
        );

        expect(actualExpectedCounts).toEqual(
            buildExpectedSignatureCounts(expectedWorker.rowSignatures),
        );
    }
}

async function readRenderedPreviewWorkerGroups(
    page: Page,
): Promise<FebruaryPreviewWorkerGroupExpectation[]> {
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
