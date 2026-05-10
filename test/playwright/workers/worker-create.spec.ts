import { randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";
import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerPaymentMethod,
    WorkerShiftPattern,
    WorkerStatus,
} from "@/types/status";
import {
    writeWorkerMatrixE2EState,
    type WorkerMatrixE2EPersistedRecord,
    type WorkerMatrixE2EProfileForCreate,
} from "../shared/matrix";
import workerE2EMatrixProfilesJson from "./workers.json";
import {
    submitWorkerForm,
    WORKER_ALL_PATH_URL_RE,
} from "./worker-submit-form";

const WORKER_FORM_ELEMENT_ID_PREFIX = "worker-form" as const;
const WORKER_E2E_DEFAULT_TABLE_STATUS =
    "Active" as const satisfies WorkerStatus;

type WorkerFormInputFieldKey =
    | "name"
    | "nric"
    | "email"
    | "phone"
    | "countryOfOrigin"
    | "race"
    | "monthlyPay"
    | "hourlyRate"
    | "restDayRate"
    | "minimumWorkingHours"
    | "cpf"
    | "payNowPhone"
    | "bankAccountNumber";

type WorkerUpsertScalars = Pick<WorkerUpsertFormInput, WorkerFormInputFieldKey>;
type WorkerUpsertChoices = Pick<
    WorkerUpsertFormInput,
    | "employmentType"
    | "employmentArrangement"
    | "shiftPattern"
    | "status"
    | "paymentMethod"
>;
type WorkerFormFieldValues = Partial<WorkerUpsertScalars & WorkerUpsertChoices>;

type WorkerE2EMatrixProfileFromJsonFile = Omit<
    WorkerUpsertFormInput,
    "nric" | "status"
>;

const WORKER_E2E_MATRIX_PROFILES =
    workerE2EMatrixProfilesJson as WorkerE2EMatrixProfileFromJsonFile[];

function createWorkerE2EMatrixRunSuffix(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function generateUniqueMatrixWorkerNric(): string {
    return `E2E${randomBytes(16).toString("hex").toUpperCase()}`;
}

function withWorkerE2EMatrixRunIdentity(
    profile: WorkerE2EMatrixProfileFromJsonFile,
    runSuffix: string,
): WorkerMatrixE2EProfileForCreate {
    const safeSuffix = runSuffix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const emailRaw = profile.email?.trim() ?? "";
    const at = emailRaw.indexOf("@");
    const taggedEmail =
        at > 0
            ? `${emailRaw.slice(0, at)}+${safeSuffix}${emailRaw.slice(at)}`
            : `${emailRaw}+${safeSuffix}`;

    return {
        ...profile,
        name: `${profile.name} ${runSuffix}`,
        nric: generateUniqueMatrixWorkerNric(),
        email: taggedEmail,
    };
}

function workerTableMoneyCellFromJsonAmount(amount: string | number): string {
    return `$${Number(amount)}`;
}

function workerTableMinimumHoursCellFromJson(hours: string | number): string {
    return `${Number(hours)}h`;
}

function nonEmptyMoneyOrHoursField(
    value: string | number | null | undefined,
): string | null {
    if (value == null) return null;
    const s = typeof value === "number" ? String(value) : value.trim();
    return s.length > 0 ? s : null;
}

function coerceFormFillText(value: string | number | null | undefined): string {
    if (value == null) return "";
    return typeof value === "number" ? String(value) : value;
}

function workerFormInputLocator(page: Page, field: WorkerFormInputFieldKey) {
    return page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-${field}`);
}

function mainTableRowByText(page: Page, text: string) {
    return page
        .getByRole("main")
        .getByRole("row")
        .filter({ hasText: text });
}

function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}

async function fillName(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "name").fill(value);
}

async function fillNric(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "nric").fill(value);
}

async function fillEmail(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "email").fill(value);
}

async function fillPhone(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "phone").fill(value);
}

async function fillCountryOfOrigin(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "countryOfOrigin").fill(value);
}

async function fillRace(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "race").fill(value);
}

async function fillMonthlyPay(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "monthlyPay").fill(value);
}

async function fillHourlyRate(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "hourlyRate").fill(value);
}

async function fillRestDayRate(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "restDayRate").fill(value);
}

async function fillMinimumWorkingHours(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "minimumWorkingHours").fill(value);
}

async function fillCpf(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "cpf").fill(value);
}

async function fillPayNowPhone(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "payNowPhone").fill(value);
}

async function fillBankAccountNumber(page: Page, value: string): Promise<void> {
    await workerFormInputLocator(page, "bankAccountNumber").fill(value);
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

async function setStatus(page: Page, value: WorkerStatus): Promise<void> {
    const group = page.getByRole("group", { name: "Status" });
    try {
        await group.waitFor({ state: "visible", timeout: 45_000 });
    } catch {
        return;
    }
    await group.getByRole("button", { name: value, exact: true }).click();
}

async function selectPaymentMethod(
    page: Page,
    method: WorkerPaymentMethod,
): Promise<void> {
    await page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-paymentMethod`).click();
    await page.getByRole("option", { name: method, exact: true }).click();
}

async function fillWorkerFormFields(
    page: Page,
    values: WorkerFormFieldValues,
): Promise<void> {
    if (values.name !== undefined) {
        await fillName(page, coerceFormFillText(values.name));
    }
    if (values.nric !== undefined) {
        await fillNric(page, coerceFormFillText(values.nric));
    }
    if (values.email !== undefined) {
        await fillEmail(page, coerceFormFillText(values.email));
    }
    if (values.phone !== undefined) {
        await fillPhone(page, coerceFormFillText(values.phone));
    }
    if (values.countryOfOrigin !== undefined) {
        await fillCountryOfOrigin(page, coerceFormFillText(values.countryOfOrigin));
    }
    if (values.race !== undefined) {
        await fillRace(page, coerceFormFillText(values.race));
    }

    if (values.employmentType !== undefined) {
        await setEmploymentType(page, values.employmentType);
    }
    if (values.employmentArrangement !== undefined) {
        await setEmploymentArrangement(page, values.employmentArrangement);
    }
    if (values.shiftPattern !== undefined) {
        await setShiftPattern(page, values.shiftPattern);
    }
    if (values.status !== undefined) {
        await setStatus(page, values.status);
    }

    if (values.monthlyPay !== undefined) {
        await fillMonthlyPay(page, coerceFormFillText(values.monthlyPay));
    }
    if (values.hourlyRate !== undefined) {
        await fillHourlyRate(page, coerceFormFillText(values.hourlyRate));
    }
    if (values.restDayRate !== undefined) {
        await fillRestDayRate(page, coerceFormFillText(values.restDayRate));
    }
    if (values.minimumWorkingHours !== undefined) {
        await fillMinimumWorkingHours(
            page,
            coerceFormFillText(values.minimumWorkingHours),
        );
    }
    if (values.cpf !== undefined) {
        await fillCpf(page, coerceFormFillText(values.cpf));
    }

    if (values.paymentMethod != null) {
        await selectPaymentMethod(page, values.paymentMethod);
    }
    if (values.payNowPhone !== undefined) {
        await fillPayNowPhone(page, coerceFormFillText(values.payNowPhone));
    }
    if (values.bankAccountNumber !== undefined) {
        await fillBankAccountNumber(
            page,
            coerceFormFillText(values.bankAccountNumber),
        );
    }
}

async function gotoNewWorker(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/new");
    await page.getByRole("button", { name: "Add New Worker" }).waitFor();
}

async function expectWorkerMatrixRowMatchesCreatedProfile(
    page: Page,
    profile: WorkerMatrixE2EProfileForCreate,
): Promise<void> {
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

test.describe.configure({ mode: "serial" });

test.describe("Worker matrix create", () => {
    test("workers.json matrix: create each profile and persist shared state", async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const runSuffix = createWorkerE2EMatrixRunSuffix();
        const records: WorkerMatrixE2EPersistedRecord[] = [];

        for (const raw of WORKER_E2E_MATRIX_PROFILES) {
            const profile = withWorkerE2EMatrixRunIdentity(raw, runSuffix);

            await gotoNewWorker(page);
            await fillWorkerFormFields(page, profile);
            await submitWorkerForm(page, "create");
            await expect(page).toHaveURL(WORKER_ALL_PATH_URL_RE, {
                timeout: 15_000,
            });

            await expectWorkerMatrixRowMatchesCreatedProfile(page, profile);

            records.push({
                name: String(profile.name),
                nric: String(profile.nric),
                profile,
            });
        }

        writeWorkerMatrixE2EState({ runSuffix, records });
    });
});
