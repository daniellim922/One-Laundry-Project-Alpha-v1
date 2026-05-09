import { expect, test } from "@playwright/test";

import {
    createDuplicateNricAssertionValue,
    createE2EWorkerFixture,
    fillNewFullTimeLocalWorker,
    gotoAllWorkers,
    gotoNewWorker,
    selectPaymentMethod,
    submitWorkerForm,
} from "./fixtures";

test.describe("Worker form validation", () => {
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
