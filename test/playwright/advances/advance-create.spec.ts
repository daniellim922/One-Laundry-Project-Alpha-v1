import { expect, test } from "@playwright/test";

import { drawSignatureStroke } from "./fixtures";
import {
    fillDatePickerInputById,
    mainTableRowByText,
    selectFromSearchCombobox,
} from "../shared/ui";
import {
    addCalendarMonthsIso,
    isoToDisplayDmy,
    readWorkerMatrixE2EState,
    todayIsoLocal,
} from "../shared/matrix";

test.describe.configure({ mode: "serial" });

test.describe("Advance matrix create", () => {
    test("workers.json matrix: submit advance request per worker", async ({
        page,
    }) => {
        test.setTimeout(480_000);

        const state = readWorkerMatrixE2EState();
        const todayIso = todayIsoLocal();
        const todayDisplay = isoToDisplayDmy(todayIso);
        const repayment1 = addCalendarMonthsIso(todayIso, 1);
        const repayment2 = addCalendarMonthsIso(todayIso, 2);
        const repayment3 = addCalendarMonthsIso(todayIso, 3);

        for (const record of state.records) {
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

                await drawSignatureStroke(page, "Manager signature");
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
