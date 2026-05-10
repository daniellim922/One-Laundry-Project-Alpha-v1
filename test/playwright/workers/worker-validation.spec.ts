import { randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerPaymentMethod,
    WorkerShiftPattern,
} from "@/types/status";

import {
    submitWorkerForm,
    WORKER_ALL_PATH_URL_RE,
} from "./worker-submit-form";

const WORKER_FORM_ELEMENT_ID_PREFIX = "worker-form" as const;

type E2EWorkerIdentity = {
    name: string;
    nric: string;
    email: string;
};

type FillNewFullTimeLocalWorkerPayFields = Pick<
    WorkerUpsertFormInput,
    "monthlyPay" | "hourlyRate" | "restDayRate" | "minimumWorkingHours"
> & {
    cpf?: WorkerUpsertFormInput["cpf"];
};

function coerceFormFillText(value: string | number | null | undefined): string {
    if (value == null) return "";
    return typeof value === "number" ? String(value) : value;
}

function createDuplicateNricAssertionValue(): string {
    return `E2EDUP${randomBytes(12).toString("hex").toUpperCase()}`;
}

function createE2EWorkerFixture(): E2EWorkerIdentity {
    const ts = Date.now();
    return {
        name: `E2E Worker ${ts}`,
        nric: `E2E${String(ts).slice(-10)}`,
        email: `e2e.worker.${ts}@example.test`,
    };
}

async function fillName(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-name`).fill(value);
}

async function fillNric(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-nric`).fill(value);
}

async function fillEmail(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-email`).fill(value);
}

async function fillMonthlyPay(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-monthlyPay`).fill(value);
}

async function fillHourlyRate(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-hourlyRate`).fill(value);
}

async function fillRestDayRate(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-restDayRate`).fill(value);
}

async function fillMinimumWorkingHours(page: Page, value: string): Promise<void> {
    await page
        .locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-minimumWorkingHours`)
        .fill(value);
}

async function fillCpf(page: Page, value: string): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-cpf`).fill(value);
}

async function setEmploymentType(
    page: Page,
    value: WorkerEmploymentType,
): Promise<void> {
    await page
        .getByRole("group", { name: "Employment type" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function setEmploymentArrangement(
    page: Page,
    value: WorkerEmploymentArrangement,
): Promise<void> {
    await page
        .getByRole("group", { name: "Employment arrangement" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function setShiftPattern(
    page: Page,
    value: WorkerShiftPattern,
): Promise<void> {
    await page
        .getByRole("group", { name: "Shift pattern" })
        .getByRole("button", { name: value, exact: true })
        .click();
}

async function selectPaymentMethod(
    page: Page,
    method: WorkerPaymentMethod,
): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-paymentMethod`).click();
    await page.getByRole("option", { name: method, exact: true }).click();
}

async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
}

async function gotoNewWorker(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/new");
    await page.getByRole("button", { name: "Add New Worker" }).waitFor();
}

async function fillNewFullTimeLocalWorker(
    page: Page,
    data: E2EWorkerIdentity,
    pay: FillNewFullTimeLocalWorkerPayFields,
): Promise<void> {
    await fillName(page, data.name);
    await fillNric(page, data.nric);
    await fillEmail(page, data.email);

    await setEmploymentType(page, "Full Time");
    await setEmploymentArrangement(page, "Local Worker");
    await setShiftPattern(page, "Day Shift");

    await fillMonthlyPay(page, coerceFormFillText(pay.monthlyPay));
    await fillHourlyRate(page, coerceFormFillText(pay.hourlyRate));
    await fillRestDayRate(page, coerceFormFillText(pay.restDayRate));
    if (pay.minimumWorkingHours) {
        await fillMinimumWorkingHours(
            page,
            coerceFormFillText(pay.minimumWorkingHours),
        );
    }
    if (pay.cpf != null && pay.cpf !== "") {
        await fillCpf(page, coerceFormFillText(pay.cpf));
    }

    await selectPaymentMethod(page, "Cash");
}

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
        await expect(page).toHaveURL(WORKER_ALL_PATH_URL_RE, {
            timeout: 15_000,
        });

        await gotoAllWorkers(page);
        const verifyTable = page.getByRole("main").locator("table").first();
        const verifySearch = page.getByRole("main").getByPlaceholder("Search...");
        await verifySearch.fill(sharedNric, { force: true });
        await expect(verifyTable.locator("tbody tr")).toHaveCount(1);

        const second = { ...createE2EWorkerFixture(), nric: sharedNric };
        await gotoNewWorker(page);
        await fillNewFullTimeLocalWorker(page, second, pay);
        await submitWorkerForm(page, "create", { expectInlineError: true });
        await expect(
            page.getByText("NRIC already exists", { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
    });
});
