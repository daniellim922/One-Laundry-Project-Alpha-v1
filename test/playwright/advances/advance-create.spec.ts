import { expect, test, type Page } from "@playwright/test";

import {
    addCalendarMonthsIso,
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

async function drawSignatureStroke(page: Page, ariaLabel: string): Promise<void> {
    const canvas = page.locator(`canvas[aria-label="${ariaLabel}"]`);
    await canvas.scrollIntoViewIfNeeded();
    await canvas.waitFor({ state: "visible", timeout: 30_000 });
    await expect
        .poll(
            async () => {
                const box = await canvas.boundingBox();
                return box != null && box.width >= 40 && box.height >= 40;
            },
            { timeout: 15_000 },
        )
        .toBeTruthy();

    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const startX = box!.x + Math.min(24, box!.width * 0.15);
    const startY = box!.y + Math.min(48, box!.height * 0.35);
    const endX = box!.x + box!.width * 0.88;
    const endY = box!.y + box!.height * 0.58;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.mouse.up();
}

test.describe.configure({ mode: "serial" });

test.describe("Advance matrix create", () => {
    test("workers.json matrix: submit advance for FT foreign day-shift cash worker", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);
        const repayment1 = addCalendarMonthsIso(todayIso, 1);
        const repayment2 = addCalendarMonthsIso(todayIso, 2);
        const repayment3 = addCalendarMonthsIso(todayIso, 3);

        for (const record of getTimesheetAdvanceMatrixRecords(state)) {
            const workerName = record.name;

            await test.step(`Submit advance for ${workerName}`, async () => {
                await page.goto("/dashboard/advance/new");
                await page
                    .getByRole("heading", { name: "Employee advance request form" })
                    .waitFor();

                await page
                    .getByRole("button", { name: "Add installment row" })
                    .waitFor({ state: "visible", timeout: 30_000 });

                await page.getByRole("button", { name: "Add installment row" }).click();
                await page.getByRole("button", { name: "Add installment row" }).click();

                await selectFromSearchCombobox(
                    page,
                    "#advance-request-form-worker",
                    workerName,
                    "Search employees…",
                );

                await fillDatePickerInputById(
                    page,
                    "advance-request-form-request-date",
                    todayIso,
                );

                await page.locator("#advance-request-form-amount").fill("600");
                await page.locator("#advance-request-form-purpose").fill(
                    "E2E matrix advance repayment plan",
                );

                await page.locator("#advance-request-form-inst-0").fill("200");
                await page.locator("#advance-request-form-inst-1").fill("200");
                await page.locator("#advance-request-form-inst-2").fill("200");

                await fillDatePickerInputById(
                    page,
                    "advance-request-form-repayment-0",
                    repayment1,
                );
                await fillDatePickerInputById(
                    page,
                    "advance-request-form-repayment-1",
                    repayment2,
                );
                await fillDatePickerInputById(
                    page,
                    "advance-request-form-repayment-2",
                    repayment3,
                );

                await drawSignatureStroke(page, "Employee signature");

                await page.getByTestId("advance-request-submit").click();

                await expect(page).toHaveURL(/\/dashboard\/advance\/all$/, {
                    timeout: 180_000,
                });
                await page.getByRole("heading", { name: "All advances" }).waitFor();

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
                await expect(row.first()).toContainText("$600");
                await expect(row.first()).toContainText("Advance Loan");
                await expect(row.first()).toContainText(todayDisplay);

                await search.fill("", { force: true });
            });
        }
    });
});
