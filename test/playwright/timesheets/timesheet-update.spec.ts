import { expect, test } from "@playwright/test";

import { mainTableRowByText } from "../shared/ui";
import {
    isoToDisplayDmy,
    readWorkerMatrixE2EState,
    todayIsoLocal,
} from "../shared/matrix";
import { gotoAllTimesheets, openTimesheetRowActionsFromRow } from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Timesheet matrix update", () => {
    test("workers.json matrix: edit created entry (hours recalc)", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);

        for (const record of state.records) {
            const workerName = record.name;

            await test.step(`Update timesheet for ${workerName}`, async () => {
                await gotoAllTimesheets(page);

                const table = page.getByRole("main").locator("table").first();
                await expect(
                    table
                        .getByRole("button", { name: "Open row actions" })
                        .first(),
                ).toBeVisible({ timeout: 60_000 });

                const search = page.getByRole("main").getByPlaceholder("Search...");
                await search.fill(workerName, { force: true });
                await expect
                    .poll(async () => table.locator("tbody tr").count(), {
                        timeout: 15_000,
                    })
                    .toBeGreaterThan(0);

                const row = mainTableRowByText(page, workerName).filter({
                    hasText: todayDisplay,
                });
                await expect(row.first()).toContainText("10.00");

                await openTimesheetRowActionsFromRow(page, row.first(), "Edit");
                await expect(page).toHaveURL(/\/dashboard\/timesheet\/[^/]+\/edit$/);

                await page.locator("#timeOut").fill("17:00");
                await page.getByRole("button", { name: "Save", exact: true }).click();

                await expect(page).toHaveURL(/\/dashboard\/timesheet\/all$/);

                await search.fill(workerName, { force: true });
                const updated = mainTableRowByText(page, workerName).filter({
                    hasText: todayDisplay,
                });
                await expect(updated.first()).toContainText("08.00");
                await expect(updated.first()).toContainText("17:00");

                await search.fill("", { force: true });
            });
        }
    });
});
