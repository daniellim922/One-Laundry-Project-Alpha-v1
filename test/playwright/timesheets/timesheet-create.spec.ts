import { expect, test, type Page } from "@playwright/test";

import {
    getTimesheetAdvanceMatrixRecords,
    isoToDisplayDmy,
    readWorkerMatrixE2EState,
    todayIsoLocal,
} from "../shared/matrix";
import { isoToDmy } from "@/utils/time/calendar-date";

function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}

async function fillDatePickerInputById(
    page: Page,
    elementId: string,
    isoYmd: string,
): Promise<void> {
    const display = isoToDmy(isoYmd);
    await page.locator(`#${elementId}`).fill(display);
    await page.locator(`#${elementId}`).blur();
}

async function selectFromSearchCombobox(
    page: Page,
    triggerSelector: string,
    optionLabel: string,
    searchPlaceholder: string,
): Promise<void> {
    const trigger = page.locator(triggerSelector);
    await expect(trigger).toBeEnabled({ timeout: 15_000 });
    await trigger.click();

    const search = page.getByPlaceholder(searchPlaceholder);
    await expect(search).toBeVisible({ timeout: 15_000 });
    await search.click();
    await search.fill(optionLabel);

    const item = page
        .locator('[data-slot="command"]')
        .locator('[data-slot="command-item"]')
        .filter({ hasText: optionLabel });
    await expect(item.first()).toBeVisible({ timeout: 20_000 });
    await item.first().click({ force: true });
}

test.describe.configure({ mode: "serial" });

test.describe("Timesheet matrix create", () => {
    test("workers.json matrix: add one timesheet for FT foreign day-shift cash worker", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);

        for (const record of getTimesheetAdvanceMatrixRecords(state)) {
            const workerName = record.name;
            await test.step(`Create timesheet for ${workerName}`, async () => {
                await page.goto("/dashboard/timesheet/new");
                await page
                    .getByRole("heading", { name: "Add new timesheet" })
                    .waitFor();

                await selectFromSearchCombobox(
                    page,
                    "#workerId",
                    workerName,
                    "Search workers…",
                );

                await fillDatePickerInputById(page, "dateIn", todayIso);
                await fillDatePickerInputById(page, "dateOut", todayIso);

                await page.locator("#timeIn").fill("09:00");
                await page.locator("#timeOut").fill("19:00");

                await page.getByRole("button", { name: "Add", exact: true }).click();

                await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/);
                await page.getByRole("heading", { name: "All timesheets" }).waitFor();

                const table = page.getByRole("main").locator("table").first();
                await expect(
                    table.getByRole("button", { name: "Open row actions" }).first(),
                ).toBeVisible({ timeout: 60_000 });

                const search = page.getByRole("main").getByPlaceholder("Search...");
                await search.fill(workerName, { force: true });
                await expect
                    .poll(async () => table.locator("tbody tr").count(), {
                        timeout: 15_000,
                    })
                    .toBeGreaterThan(0);

                const row = mainTableRowByText(page, workerName);
                await expect(row.first()).toBeVisible();
                await expect(row.first()).toContainText(todayDisplay);
                await expect(row.first()).toContainText("09:00");
                await expect(row.first()).toContainText("19:00");
                await expect(row.first()).toContainText("10.00");
                await expect(row.first()).toContainText("Timesheet Unpaid");

                await search.fill("", { force: true });
            });
        }
    });
});
