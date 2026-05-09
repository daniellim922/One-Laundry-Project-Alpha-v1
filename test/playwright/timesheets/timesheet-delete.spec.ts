import { expect, test } from "@playwright/test";

import { mainTableRowByText } from "../shared/ui";
import {
    isoToDisplayDmy,
    readWorkerMatrixE2EState,
    todayIsoLocal,
} from "../shared/matrix";
import {
    confirmTimesheetDeleteDialog,
    gotoAllTimesheets,
    openTimesheetRowActionsFromRow,
} from "./fixtures";

test.describe.configure({ mode: "serial" });

test.describe("Timesheet matrix delete", () => {
    test("workers.json matrix: delete entry created by matrix flow", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);

        for (const record of state.records) {
            const workerName = record.name;

            await test.step(`Delete timesheet for ${workerName}`, async () => {
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
                await expect(row.first()).toBeVisible();

                await openTimesheetRowActionsFromRow(page, row.first(), "Delete");
                await confirmTimesheetDeleteDialog(page);

                await expect
                    .poll(
                        async () => {
                            await search.fill(workerName, { force: true });
                            const filtered = mainTableRowByText(
                                page,
                                workerName,
                            ).filter({
                                hasText: todayDisplay,
                            });
                            return filtered.count();
                        },
                        { timeout: 30_000, intervals: [200, 400, 800] },
                    )
                    .toBe(0);

                await search.fill("", { force: true });
            });
        }
    });
});
