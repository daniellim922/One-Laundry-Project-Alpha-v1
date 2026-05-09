import { expect, test } from "@playwright/test";

import {
    WORKER_E2E_DEFAULT_TABLE_STATUS,
    WORKER_E2E_MATRIX_PROFILES,
    createDuplicateNricAssertionValue,
    createE2EWorkerFixture,
    createWorkerE2EMatrixRunSuffix,
    fillNewFullTimeLocalWorker,
    fillWorkerFormFields,
    gotoAllWorkers,
    gotoNewWorker,
    selectPaymentMethod,
    submitWorkerForm,
    workerTableMinimumHoursCellFromJson,
    workerTableMoneyCellFromJsonAmount,
    workerTableRow,
    withWorkerE2EMatrixRunIdentity,
} from "../fixtures";

function nonEmptyMoneyOrHoursField(
    value: string | number | null | undefined,
): string | null {
    if (value == null) return null;
    const s = typeof value === "number" ? String(value) : value.trim();
    return s.length > 0 ? s : null;
}

test.describe.configure({ mode: "serial" });

test.describe("Worker CRUD and validation", () => {
    test("workers.json matrix: each profile creates and matches table row", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const runSuffix = createWorkerE2EMatrixRunSuffix();

        for (const raw of WORKER_E2E_MATRIX_PROFILES) {
            const profile = withWorkerE2EMatrixRunIdentity(raw, runSuffix);

            await gotoNewWorker(page);
            await fillWorkerFormFields(page, profile);
            await submitWorkerForm(page, "create");
            await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

            const row = workerTableRow(page, profile.name);
            await expect(row).toBeVisible();
            await expect(row).toContainText(WORKER_E2E_DEFAULT_TABLE_STATUS);
            expect(profile.shiftPattern).toBeTruthy();
            expect(profile.employmentType).toBeTruthy();
            expect(profile.employmentArrangement).toBeTruthy();
            expect(profile.paymentMethod).toBeTruthy();

            await expect(row).toContainText(profile.shiftPattern!);
            await expect(row).toContainText(profile.employmentType!);
            await expect(row).toContainText(profile.employmentArrangement!);
            await expect(row).toContainText(profile.paymentMethod!);

            const monthlyPay = nonEmptyMoneyOrHoursField(profile.monthlyPay);
            if (monthlyPay != null) {
                await expect(row).toContainText(
                    workerTableMoneyCellFromJsonAmount(monthlyPay),
                );
            }
            const hourlyRate = nonEmptyMoneyOrHoursField(profile.hourlyRate);
            if (hourlyRate != null) {
                await expect(row).toContainText(
                    workerTableMoneyCellFromJsonAmount(hourlyRate),
                );
            }
            const minimumWorkingHours = nonEmptyMoneyOrHoursField(
                profile.minimumWorkingHours,
            );
            if (minimumWorkingHours != null) {
                await expect(row).toContainText(
                    workerTableMinimumHoursCellFromJson(minimumWorkingHours),
                );
            }
        }
    });

    test("full-time local worker: view, edit; table and view match", async ({
        page,
    }) => {
        const data = createE2EWorkerFixture();
        const pay = {
            monthlyPay: "3000",
            hourlyRate: "15",
            restDayRate: "25",
            minimumWorkingHours: "260",
        };

        await gotoNewWorker(page);
        await fillNewFullTimeLocalWorker(page, data, pay);
        await submitWorkerForm(page, "create");
        await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

        const row = workerTableRow(page, data.name);
        await expect(row).toBeVisible();

        await row.getByRole("button", { name: "Open row actions" }).click();
        await page.getByRole("menuitem", { name: "View" }).click({ force: true });
        await expect(page).toHaveURL(/\/dashboard\/worker\/[^/]+\/view/);
        await expect(
            page.getByRole("heading", { name: "View worker" }),
        ).toBeVisible();

        await expect(page.locator("#worker-form-name")).toBeDisabled();
        await expect(page.locator("#worker-form-name")).toHaveValue(data.name);
        await expect(
            page.getByRole("group", { name: "Status" }),
        ).toBeVisible();
        await expect(
            page
                .getByRole("group", { name: "Status" })
                .getByRole("button", { name: "Active", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");

        const updatedName = `${data.name} Updated`;
        await page
            .getByRole("main")
            .getByRole("link", { name: "Edit", exact: true })
            .click();
        await expect(page).toHaveURL(/\/dashboard\/worker\/[^/]+\/edit/);

        await page.locator("#worker-form-name").fill(updatedName);
        await page
            .getByRole("group", { name: "Status" })
            .getByRole("button", { name: "Inactive" })
            .click();
        await page
            .getByRole("group", { name: "Shift pattern" })
            .getByRole("button", { name: "Night Shift" })
            .click();
        await page.locator("#worker-form-monthlyPay").fill("3100");
        await selectPaymentMethod(page, "PayNow");
        await page.locator("#worker-form-payNowPhone").fill("91234567");

        await submitWorkerForm(page, "edit");
        await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

        const updatedRow = workerTableRow(page, updatedName);
        await expect(updatedRow).toBeVisible();
        await expect(updatedRow).toContainText("Inactive");
        await expect(updatedRow).toContainText("Night Shift");
        await expect(updatedRow).toContainText("$3100");
        await expect(updatedRow).toContainText("PayNow");

        await updatedRow
            .getByRole("button", { name: "Open row actions" })
            .click();
        await page.getByRole("menuitem", { name: "View" }).click({ force: true });
        await expect(page.locator("#worker-form-name")).toHaveValue(updatedName);
        await expect(
            page
                .getByRole("group", { name: "Status" })
                .getByRole("button", { name: "Inactive", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
    });

    test("required name shows validation after touch", async ({ page }) => {
        await gotoNewWorker(page);
        const name = page.locator("#worker-form-name");
        await name.fill("x");
        await name.clear();
        await name.blur();
        await expect(page.getByText("Name is required")).toBeVisible();
    });

    test("invalid email shows validation after touch", async ({ page }) => {
        await gotoNewWorker(page);
        await page.getByLabel("Email", { exact: true }).fill("not-an-email");
        await page.getByLabel("Email", { exact: true }).blur();
        await expect(
            page.getByText("Enter a valid email address", { exact: true }),
        ).toBeVisible();
    });

    test("part time requires hourly rate; submit stays disabled without it", async ({
        page,
    }) => {
        await gotoNewWorker(page);
        await page
            .getByRole("group", { name: "Employment type" })
            .getByRole("button", { name: "Part Time" })
            .click();

        const data = createE2EWorkerFixture();
        await page.locator("#worker-form-name").fill(data.name);
        await page.locator("#worker-form-nric").fill(data.nric);

        await expect(
            page.getByRole("button", { name: "Add New Worker" }),
        ).toBeDisabled();

        const hourly = page.locator("#worker-form-hourlyRate");
        await hourly.focus();
        await hourly.blur();
        await expect(
            page.getByText("Hourly rate is required for part time workers"),
        ).toBeVisible();
    });

    test("full-time pay fields surface required messages when touched", async ({
        page,
    }) => {
        await gotoNewWorker(page);
        const data = createE2EWorkerFixture();
        await page.locator("#worker-form-name").fill(data.name);

        const monthly = page.locator("#worker-form-monthlyPay");
        await monthly.focus();
        await monthly.blur();
        await expect(
            page.getByText("Monthly pay is required for full time workers"),
        ).toBeVisible();
    });

    test("PayNow requires PayNow number before submit", async ({ page }) => {
        await gotoNewWorker(page);
        const data = createE2EWorkerFixture();
        await fillNewFullTimeLocalWorker(page, data, {
            monthlyPay: "2800",
            hourlyRate: "12",
            restDayRate: "20",
            minimumWorkingHours: "250",
        });
        await selectPaymentMethod(page, "PayNow");
        await page.locator("#worker-form-payNowPhone").clear();
        await expect(
            page.getByRole("button", { name: "Add New Worker" }),
        ).toBeDisabled();
    });

    test("Bank Transfer requires account number before submit", async ({
        page,
    }) => {
        await gotoNewWorker(page);
        const data = createE2EWorkerFixture();
        await fillNewFullTimeLocalWorker(page, data, {
            monthlyPay: "2800",
            hourlyRate: "12",
            restDayRate: "20",
            minimumWorkingHours: "250",
        });
        await selectPaymentMethod(page, "Bank Transfer");
        await page.locator("#worker-form-bankAccountNumber").clear();
        await expect(
            page.getByRole("button", { name: "Add New Worker" }),
        ).toBeDisabled();
    });

    test("duplicate NRIC shows server error", async ({ page }) => {
        const sharedNric = createDuplicateNricAssertionValue();
        const pay = {
            monthlyPay: "2800",
            hourlyRate: "12",
            restDayRate: "20",
            minimumWorkingHours: "250",
        };

        const first = { ...createE2EWorkerFixture(), nric: sharedNric };
        await gotoNewWorker(page);
        await fillNewFullTimeLocalWorker(page, first, pay);
        await submitWorkerForm(page, "create");
        await expect(page).toHaveURL(/\/dashboard\/worker\/all/);

        await gotoAllWorkers(page);
        const verifyTable = page.getByRole("main").locator("table").first();
        const verifySearch = page.getByRole("main").getByPlaceholder("Search...");
        await verifySearch.fill(sharedNric, { force: true });
        await expect(verifyTable.locator("tbody tr")).toHaveCount(1);

        const second = { ...createE2EWorkerFixture(), nric: sharedNric };
        await gotoNewWorker(page);
        await fillNewFullTimeLocalWorker(page, second, pay);
        await submitWorkerForm(page, "create");
        await expect(
            page.getByText("NRIC already exists", { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
    });

});
