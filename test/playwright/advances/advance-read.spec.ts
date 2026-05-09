import { expect, test } from "@playwright/test";

import {
    expectAdvanceDetailAmountRequested,
    gotoAllAdvances,
    openAdvanceRowActionsFromRow,
} from "./fixtures";
import { mainTableRowByText } from "../shared/ui";
import { readWorkerMatrixE2EState } from "../shared/matrix";

test.describe.configure({ mode: "serial" });

test.describe("Advance matrix read", () => {
    test("workers.json matrix: view advance request breakdown", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();

        for (const record of state.records) {
            const workerName = record.name;

            await test.step(`Read advance for ${workerName}`, async () => {
                await gotoAllAdvances(page);

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
                    hasText: "$600",
                });
                await expect(row.first()).toBeVisible();

                await openAdvanceRowActionsFromRow(page, row.first(), "View");
                await expect(page).toHaveURL(/\/dashboard\/advance\/[^/]+\/breakdown$/);
                await expectAdvanceDetailAmountRequested(page, "$600");

                const repaymentTable = page
                    .getByTestId("advance-detail")
                    .locator("table")
                    .first();
                await expect(repaymentTable.locator("tbody tr")).toHaveCount(3);
                for (let i = 0; i < 3; i++) {
                    await expect(
                        repaymentTable.locator("tbody tr").nth(i),
                    ).toContainText("$200");
                }

                await search.fill("", { force: true });
            });
        }
    });
});
