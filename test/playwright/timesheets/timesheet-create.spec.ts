import { expect, test } from "@playwright/test";

import {
    fillDatePickerInputById,
    mainTableRowByText,
    selectFromSearchCombobox,
} from "../shared/ui";
import {
    isoToDisplayDmy,
    readWorkerMatrixE2EState,
    todayIsoLocal,
} from "../shared/matrix";

test.describe.configure({ mode: "serial" });

test.describe("Timesheet matrix create", () => {
    test("workers.json matrix: add one timesheet entry per worker", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);

        for (const record of state.records) {
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
