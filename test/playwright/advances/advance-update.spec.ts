import { expect, test } from "@playwright/test";

import {
    expectAdvanceDetailAmountRequested,
    gotoAllAdvances,
    openAdvanceRowActionsFromRow,
} from "./fixtures";
import { mainTableRowByText } from "../shared/ui";
import { readWorkerMatrixE2EState } from "../shared/matrix";

test.describe.configure({ mode: "serial" });

test.describe("Advance matrix update", () => {
    test("workers.json matrix: double amount requested and installments", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();

        for (const record of state.records) {
            const workerName = record.name;

            await test.step(`Update advance for ${workerName}`, async () => {
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

                const rowFor600 = mainTableRowByText(page, workerName).filter({
                    hasText: "$600",
                });
                await expect(rowFor600.first()).toBeVisible();

                await openAdvanceRowActionsFromRow(page, rowFor600.first(), "View");
                await expect(page).toHaveURL(/\/dashboard\/advance\/[^/]+\/breakdown$/);

                await page.getByRole("link", { name: "Edit" }).click();
                await expect(page).toHaveURL(/\/dashboard\/advance\/[^/]+\/edit$/);

                await page.locator("#advance-request-form-inst-0").waitFor({
                    state: "visible",
                    timeout: 30_000,
                });

                await page.locator("#advance-request-form-amount").fill("1200");
                await page.locator("#advance-request-form-inst-0").fill("400");
                await page.locator("#advance-request-form-inst-1").fill("400");
                await page.locator("#advance-request-form-inst-2").fill("400");

                await page.getByTestId("advance-request-submit").click();

                await expect(page).toHaveURL(/\/dashboard\/advance\/[^/]+/, {
                    timeout: 180_000,
                });
                await expect(
                    page.getByRole("heading", { name: "Advance request" }),
                ).toBeVisible({ timeout: 60_000 });

                await gotoAllAdvances(page);

                await search.fill(workerName, { force: true });
                const row1200 = mainTableRowByText(page, workerName).filter({
                    hasText: "$1200",
                });
                await expect(row1200.first()).toBeVisible();

                await openAdvanceRowActionsFromRow(page, row1200.first(), "View");
                await expectAdvanceDetailAmountRequested(page, "$1200");

                const repaymentTableDoubled = page
                    .getByTestId("advance-detail")
                    .locator("table")
                    .first();
                await expect(repaymentTableDoubled.locator("tbody tr")).toHaveCount(
                    3,
                );
                for (let i = 0; i < 3; i++) {
                    await expect(
                        repaymentTableDoubled.locator("tbody tr").nth(i),
                    ).toContainText("$400");
                }

                await search.fill("", { force: true });
            });
        }
    });
});
