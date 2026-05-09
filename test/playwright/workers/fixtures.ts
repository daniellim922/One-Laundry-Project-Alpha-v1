import { randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import type { WorkerUpsertFormInput } from "@/db/schemas/worker-employment";

import type {
    WorkerEmploymentArrangement,
    WorkerEmploymentType,
    WorkerPaymentMethod,
    WorkerShiftPattern,
    WorkerStatus,
} from "@/types/status";

import type { WorkerMatrixE2EProfileForCreate } from "../shared/matrix";
import { mainTableRowByText } from "../shared/ui";

import workerE2EMatrixProfilesJson from "./workers.json";

export {
    readWorkerMatrixE2EState,
    writeWorkerMatrixE2EState,
    workerMatrixE2EStatePath,
} from "../shared/matrix";

export type {
    WorkerMatrixE2EPersistedRecord,
    WorkerMatrixE2EStateFile,
} from "../shared/matrix";

/** Matches `formId` in `WorkerForm` (`app/dashboard/worker/worker-form.tsx`). */
const WORKER_FORM_ELEMENT_ID_PREFIX = "worker-form" as const;

/** Table shows this for workers created on `/dashboard/worker/new` (no Status toggle on create). */
export const WORKER_E2E_DEFAULT_TABLE_STATUS = "Active" as const satisfies WorkerStatus;

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

function coerceFormFillText(value: string | number | null | undefined): string {
    if (value == null) return "";
    return typeof value === "number" ? String(value) : value;
}

type WorkerUpsertChoices = Pick<
    WorkerUpsertFormInput,
    | "employmentType"
    | "employmentArrangement"
    | "shiftPattern"
    | "status"
    | "paymentMethod"
>;

/** Form fill payload: omit keys rather than relying on sparse JSON rows. */
export type WorkerFormFieldValues = Partial<
    WorkerUpsertScalars & WorkerUpsertChoices
>;

export type WorkerE2EMatrixProfileFromJsonFile = Omit<
    WorkerUpsertFormInput,
    "nric" | "status"
>;

/** Resolved matrix row passed to create form (crypto NRIC per row; omit status → Active). */
export type WorkerE2EMatrixProfileForCreate = WorkerMatrixE2EProfileForCreate;

export const WORKER_E2E_MATRIX_PROFILES =
    workerE2EMatrixProfilesJson as WorkerE2EMatrixProfileFromJsonFile[];

/** Short unique token for plus-tags and display-name suffix within one Playwright run. */
export function createWorkerE2EMatrixRunSuffix(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function generateUniqueMatrixWorkerNric(): string {
    return `E2E${randomBytes(16).toString("hex").toUpperCase()}`;
}

/** Deterministic-but-unique NRIC prefix for assertions (avoids substring collisions with matrix `E2E…` identities). */
export function createDuplicateNricAssertionValue(): string {
    return `E2EDUP${randomBytes(12).toString("hex").toUpperCase()}`;
}

function workerFormInputLocator(page: Page, field: WorkerFormInputFieldKey) {
    return page.locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-${field}`);
}

/**
 * Unique identities per run: crypto NRIC, plus-tagged email, display name includes run suffix.
 */
export function withWorkerE2EMatrixRunIdentity(
    profile: WorkerE2EMatrixProfileFromJsonFile,
    runSuffix: string,
): WorkerE2EMatrixProfileForCreate {
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

/** Mirrors monthly/hourly/rest-day cells in `app/dashboard/worker/all/columns.tsx`. */
export function workerTableMoneyCellFromJsonAmount(
    amount: string | number,
): string {
    return `$${Number(amount)}`;
}

/** Mirrors minimum-hours cell (`${number}h`) after DB normalization. */
export function workerTableMinimumHoursCellFromJson(hours: string | number): string {
    return `${Number(hours)}h`;
}

export function nonEmptyMoneyOrHoursField(
    value: string | number | null | undefined,
): string | null {
    if (value == null) return null;
    const s = typeof value === "number" ? String(value) : value.trim();
    return s.length > 0 ? s : null;
}

/** Keeps email valid by inserting `edited` before `@`. */
export function workerMatrixEmailInsertEdited(email: string): string {
    const trimmed = email.trim();
    const at = trimmed.indexOf("@");
    if (at <= 0) return `${trimmed}edited`;
    return `${trimmed.slice(0, at)}edited${trimmed.slice(at)}`;
}

export function workerMatrixMoneyAddCent(value: string): string {
    const n = Number(value.trim());
    const next = n + 0.01;
    const rounded = Math.round(next * 100) / 100;
    return String(rounded);
}

/** Like `250` → `25001` per matrix E2E convention (whole-number-ish fields). */
export function workerMatrixIntegerLikeAppend01(value: string): string {
    const s = value.trim();
    const base = s.includes(".") ? s.split(".")[0] ?? s : s;
    return `${base}01`;
}

export function applyWorkerMatrixUpdateTransforms(
    profile: WorkerE2EMatrixProfileForCreate,
): WorkerFormFieldValues {
    const out: WorkerFormFieldValues = {};
    out.name = `${profile.name} edited`;
    out.nric = `${profile.nric}01`;
    if (profile.email != null && profile.email.trim() !== "") {
        out.email = workerMatrixEmailInsertEdited(profile.email);
    }
    const phone = profile.phone?.trim();
    if (phone != null && phone !== "") {
        out.phone = `${phone}01`;
    }
    if (
        profile.countryOfOrigin != null &&
        String(profile.countryOfOrigin).trim() !== ""
    ) {
        out.countryOfOrigin = `${coerceFormFillText(profile.countryOfOrigin)} edited`;
    }
    if (profile.race != null && String(profile.race).trim() !== "") {
        out.race = `${coerceFormFillText(profile.race)} edited`;
    }

    const monthlyPay = nonEmptyMoneyOrHoursField(profile.monthlyPay);
    if (monthlyPay != null) {
        out.monthlyPay = workerMatrixMoneyAddCent(monthlyPay);
    }
    const hourlyRate = nonEmptyMoneyOrHoursField(profile.hourlyRate);
    if (hourlyRate != null) {
        out.hourlyRate = workerMatrixMoneyAddCent(hourlyRate);
    }
    const restDayRate = nonEmptyMoneyOrHoursField(profile.restDayRate);
    if (restDayRate != null) {
        out.restDayRate = workerMatrixMoneyAddCent(restDayRate);
    }
    const minimumWorkingHours = nonEmptyMoneyOrHoursField(
        profile.minimumWorkingHours,
    );
    if (minimumWorkingHours != null) {
        out.minimumWorkingHours =
            workerMatrixIntegerLikeAppend01(minimumWorkingHours);
    }
    const cpf = nonEmptyMoneyOrHoursField(profile.cpf);
    if (cpf != null) {
        out.cpf = workerMatrixIntegerLikeAppend01(cpf);
    }

    if (profile.payNowPhone != null && String(profile.payNowPhone).trim() !== "") {
        out.payNowPhone = `${coerceFormFillText(profile.payNowPhone)}01`;
    }
    if (
        profile.bankAccountNumber != null &&
        String(profile.bankAccountNumber).trim() !== ""
    ) {
        out.bankAccountNumber = `${coerceFormFillText(profile.bankAccountNumber)}01`;
    }

    return out;
}

export async function expectWorkerMatrixRowMatchesCreatedProfile(
    page: Page,
    profile: WorkerE2EMatrixProfileForCreate,
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

export async function expectWorkerMatrixRowMatchesUpdatedProfile(
    page: Page,
    originalProfile: WorkerE2EMatrixProfileForCreate,
    transforms: WorkerFormFieldValues,
): Promise<void> {
    const row = workerTableRow(page, transforms.name!);
    await expect(row).toBeVisible();
    await expect(row).toContainText(WORKER_E2E_DEFAULT_TABLE_STATUS);
    await expect(row).toContainText(originalProfile.shiftPattern!);
    await expect(row).toContainText(originalProfile.employmentType!);
    await expect(row).toContainText(originalProfile.employmentArrangement!);
    await expect(row).toContainText(originalProfile.paymentMethod!);

    const monthlyPay = transforms.monthlyPay;
    if (monthlyPay != null && monthlyPay !== "") {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(monthlyPay),
        );
    }
    const hourlyRate = transforms.hourlyRate;
    if (hourlyRate != null && hourlyRate !== "") {
        await expect(row).toContainText(
            workerTableMoneyCellFromJsonAmount(hourlyRate),
        );
    }
    const minimumWorkingHours = transforms.minimumWorkingHours;
    if (minimumWorkingHours != null && minimumWorkingHours !== "") {
        await expect(row).toContainText(
            workerTableMinimumHoursCellFromJson(minimumWorkingHours),
        );
    }
}

export async function openWorkerRowMenuItem(
    page: Page,
    workerName: string,
    item: "View" | "Edit",
): Promise<void> {
    const row = workerTableRow(page, workerName);
    await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: "Open row actions" }).click();

    const menuitem = page.getByRole("menuitem", { name: item, exact: true });
    await menuitem.waitFor({ state: "visible", timeout: 15_000 });
    await menuitem.scrollIntoViewIfNeeded();

    try {
        await menuitem.click({ force: true, timeout: 10_000 });
    } catch {
        const href = await menuitem.getAttribute("href");
        if (href?.startsWith("/")) {
            await page.goto(href);
            return;
        }
        throw new Error(
            `Could not open worker row action "${item}" (no usable href fallback).`,
        );
    }
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
        await group.waitFor({ state: "visible", timeout: 15_000 });
    } catch {
        // Create-worker route omits the Status toggle (defaults to Active in form state).
        return;
    }
    await group.getByRole("button", { name: value, exact: true }).click();
}

export async function selectPaymentMethod(
    page: Page,
    method: WorkerPaymentMethod,
): Promise<void> {
    await page
        .locator(`#${WORKER_FORM_ELEMENT_ID_PREFIX}-paymentMethod`)
        .click();
    await page.getByRole("option", { name: method, exact: true }).click();
}

/**
 * Applies only keys present on `values`. Order matches typical UX (identity → choices → pay → payment).
 */
export async function fillWorkerFormFields(
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
    if (values.status !== undefined) await setStatus(page, values.status);

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

export async function gotoWorkerOverview(page: Page): Promise<void> {
    await page.goto("/dashboard/worker");
    await page.getByRole("heading", { name: "Worker" }).waitFor();
}

export async function gotoAllWorkers(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/all");
    await page.getByRole("heading", { name: "All workers" }).waitFor();
}

export async function gotoNewWorker(page: Page): Promise<void> {
    await page.goto("/dashboard/worker/new");
    await page.getByRole("button", { name: "Add New Worker" }).waitFor();
}

/** Create flows always need concrete identity strings (stricter than nullable DB input). */
export type E2EWorkerIdentity = {
    name: string;
    nric: string;
    email: string;
};

export function createE2EWorkerFixture(): E2EWorkerIdentity {
    const ts = Date.now();
    return {
        name: `E2E Worker ${ts}`,
        nric: `E2E${String(ts).slice(-10)}`,
        email: `e2e.worker.${ts}@example.test`,
    };
}

export type FillNewFullTimeLocalWorkerPayFields = Pick<
    WorkerUpsertFormInput,
    "monthlyPay" | "hourlyRate" | "restDayRate" | "minimumWorkingHours"
> & {
    cpf?: WorkerUpsertFormInput["cpf"];
};

export async function fillNewFullTimeLocalWorker(
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

export async function submitWorkerForm(
    page: Page,
    mode: "create" | "edit",
): Promise<void> {
    const label = mode === "create" ? "Add New Worker" : "Save changes";
    await page.getByRole("button", { name: label }).click();
}

export function workerTableRow(page: Page, workerName: string) {
    return mainTableRowByText(page, workerName);
}
